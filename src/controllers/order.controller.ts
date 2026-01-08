/**
 * Order controller for handling order creation
 */

import { Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { CreateOrderRequest } from '../middlewares/validation.middleware';
import { GeocodingService } from '../services/geocoding.service';
import { PaymentService } from '../services/payment.service';
import { WarehouseService } from '../services/warehouse.service';
import { BusinessError } from '../middlewares/error-handler.middleware';
import { OrderResponse } from '../types/order.types';

/**
 * Order controller class
 */
export class OrderController {
  private geocodingService: GeocodingService;
  private paymentService: PaymentService;
  private warehouseService: WarehouseService;

  constructor(private prisma: PrismaClient) {
    this.geocodingService = new GeocodingService();
    this.paymentService = new PaymentService();
    this.warehouseService = new WarehouseService(prisma);
  }

  /**
   * Create a new order
   * Handles the complete order creation flow:
   * 1. Geocode shipping address
   * 2. Find closest warehouse with all items
   * 3. Calculate total amount
   * 4. Create order and order items in a transaction
   * 5. Process payment
   * 6. Update order status based on payment result
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    const validatedData: CreateOrderRequest = req.body;

    // Step 1: Geocode shipping address
    const coordinates = await this.geocodingService.geocode(validatedData.address);

    // Step 2: Find closest warehouse with all items
    const warehouse = await this.warehouseService.findClosestWarehouse(
      validatedData.items,
      {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }
    );

    // Step 3: Fetch products and calculate total amount
    const productIds = validatedData.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    // Validate all products exist
    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new BusinessError(
        `Products not found: ${missingIds.join(', ')}`,
        404,
        'PRODUCTS_NOT_FOUND'
      );
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const item of validatedData.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BusinessError(`Product not found: ${item.productId}`, 404, 'PRODUCT_NOT_FOUND');
      }
      totalAmount += product.price * item.quantity;
    }

    // Step 4: Create order and order items in a transaction
    // Use interactive transaction to ensure atomicity
    const order = await this.prisma.$transaction(async (tx) => {
      // Re-check inventory levels inside transaction
      const inventoryChecks = await Promise.all(
        validatedData.items.map((item) =>
          tx.inventory.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: warehouse.id,
                productId: item.productId,
              },
            },
          })
        )
      );

      // Validate inventory availability
      for (let i = 0; i < validatedData.items.length; i++) {
        const item = validatedData.items[i];
        const inventory = inventoryChecks[i];

        if (!inventory) {
          throw new BusinessError(
            `Product ${item.productId} not available in warehouse ${warehouse.id}`,
            400,
            'INVENTORY_NOT_AVAILABLE'
          );
        }

        if (inventory.quantity < item.quantity) {
          throw new BusinessError(
            `Insufficient inventory for product ${item.productId}. Available: ${inventory.quantity}, Requested: ${item.quantity}`,
            400,
            'INSUFFICIENT_INVENTORY'
          );
        }
      }

      // Deduct inventory quantities
      await Promise.all(
        validatedData.items.map((item) =>
          tx.inventory.update({
            where: {
              warehouseId_productId: {
                warehouseId: warehouse.id,
                productId: item.productId,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          })
        )
      );

      // Create Order with PENDING status
      const newOrder = await tx.order.create({
        data: {
          customerEmail: validatedData.customer.email,
          shippingAddress: validatedData.address,
          totalAmount,
          status: OrderStatus.PENDING,
        },
      });

      // Create OrderItems
      await Promise.all(
        validatedData.items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!;
          return tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: product.price,
            },
          });
        })
      );

      return newOrder;
    });

    // Step 5: Process payment (after transaction commits)
    // Use a mock card number for now (in real implementation, this would come from the request)
    const cardNumber = '4111111111111111'; // Mock card number
    const paymentResult = await this.paymentService.processPayment(cardNumber, totalAmount);

    // Step 6: Update order status based on payment result
    if (!paymentResult.success) {
      // Payment failed - order remains PENDING
      throw new BusinessError('Payment processing failed', 402, 'PAYMENT_FAILED');
    }

    // Payment succeeded - update order status to PAID
    const updatedOrder = await this.prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.PAID,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Step 7: Return order with items and warehouse information
    const response: OrderResponse = {
      id: updatedOrder.id,
      customerEmail: updatedOrder.customerEmail,
      shippingAddress: updatedOrder.shippingAddress,
      totalAmount: updatedOrder.totalAmount,
      status: updatedOrder.status,
      createdAt: updatedOrder.createdAt,
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        address: warehouse.address,
      },
      orderItems: updatedOrder.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
      })),
    };

    res.status(201).json(response);
  }
}
