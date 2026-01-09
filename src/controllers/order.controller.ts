/**
 * Order controller for handling order creation
 */

import { Request, Response } from "express";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { CreateOrderRequest } from "../middlewares/validation.middleware";
import { GeocodingService } from "../services/geocoding.service";
import { PaymentService } from "../services/payment.service";
import { WarehouseService } from "../services/warehouse.service";
import { BusinessError } from "../middlewares/error-handler.middleware";
import { OrderResponse } from "../types/order.types";

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
   * 4. Create order and order items in a transaction (deducts inventory)
   * 5. Process payment inside transaction to ensure atomicity
   * 6. Update order status based on payment result:
   *    - If payment succeeds: mark order as PAID
   *    - If payment fails: transaction rolls back, no order created
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    const validatedData: CreateOrderRequest = req.body;

    // Step 1: Geocode shipping address
    const coordinates = await this.geocodingService.geocode(
      validatedData.address
    );

    // Step 2: Find closest warehouse with all items
    const warehouseSelection = await this.warehouseService.findClosestWarehouse(
      validatedData.items,
      {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }
    );
    const warehouse = warehouseSelection.warehouse;

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
        `Products not found: ${missingIds.join(", ")}`,
        404,
        "PRODUCTS_NOT_FOUND"
      );
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const item of validatedData.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BusinessError(
          `Product not found: ${item.productId}`,
          404,
          "PRODUCT_NOT_FOUND"
        );
      }
      totalAmount += product.price * item.quantity;
    }

    // Step 4: Process payment FIRST (before deducting inventory)
    const { creditCard } = validatedData.paymentDetails;
    const paymentResult = await this.paymentService.processPayment(
      creditCard,
      totalAmount,
      `Order for ${validatedData.customer.email}`
    );

    if (!paymentResult.success || !paymentResult.transactionId) {
      // Payment failed - don't deduct inventory or create order
      throw new BusinessError(
        "Payment processing failed",
        402,
        "PAYMENT_FAILED"
      );
    }

    // Step 5: Create order and order items in a transaction (only if payment succeeded)
    let order;
    try {
      // Use interactive transaction to ensure atomicity
      order = await this.prisma.$transaction(async (tx) => {
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
              "INVENTORY_NOT_AVAILABLE"
            );
          }

          if (inventory.quantity < item.quantity) {
            throw new BusinessError(
              `Insufficient inventory for product ${item.productId}. Available: ${inventory.quantity}, Requested: ${item.quantity}`,
              400,
              "INSUFFICIENT_INVENTORY"
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

        // Create Order with PAID status (payment already succeeded)
        const newOrder = await tx.order.create({
          data: {
            customerEmail: validatedData.customer.email,
            shippingAddress: validatedData.address,
            totalAmount,
            status: OrderStatus.PAID,
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
    } catch (error) {
      // Compensation Logic: Refund payment if database transaction fails
      console.error("Order creation failed after payment. Initiating refund...", error);
      try {
        await this.paymentService.refundPayment(
          paymentResult.transactionId,
          totalAmount,
          "Order creation failed due to inventory/database error"
        );
      } catch (refundError) {
        // CRITICAL: Log this event to a separate monitoring service as it requires manual intervention
        console.error("CRITICAL: Refund failed after order creation error!", {
          transactionId: paymentResult.transactionId,
          amount: totalAmount,
          originalError: error,
          refundError,
        });
      }
      throw error;
    }

    // Step 6: Fetch order with items for response
    const orderWithItems = await this.prisma.order.findUnique({
      where: {
        id: order.id,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!orderWithItems) {
      throw new BusinessError(
        "Order not found after creation",
        500,
        "ORDER_NOT_FOUND"
      );
    }

    // Step 7: Return order with items and warehouse information
    const response: OrderResponse = {
      id: orderWithItems.id,
      customerEmail: orderWithItems.customerEmail,
      shippingAddress: orderWithItems.shippingAddress,
      totalAmount: orderWithItems.totalAmount,
      status: orderWithItems.status,
      createdAt: orderWithItems.createdAt,
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        address: warehouse.address,
        selectionReason: warehouseSelection.selectionReason,
        distanceKm: warehouseSelection.distanceKm,
        closestWarehouseExcluded: warehouseSelection.closestWarehouseExcluded,
      },
      orderItems: orderWithItems.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
      })),
    };

    res.status(201).json(response);
  }
}
