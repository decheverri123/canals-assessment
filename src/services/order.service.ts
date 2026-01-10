/**
 * Order service for handling order business logic
 */

import { PrismaClient, OrderStatus, Product } from "@prisma/client";
import { CreateOrderRequest } from "../middlewares/validation.middleware";
import { IGeocodingService } from "../types/geocoding.types";
import { IPaymentService, PaymentResult } from "../types/payment.types";
import { WarehouseService } from "./warehouse.service";
import { BusinessError } from "../middlewares/error-handler.middleware";
import { OrderResponse } from "../types/order.types";

/**
 * Idempotency record TTL in hours
 */
const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Order service class
 */
export class OrderService {
  constructor(
    private prisma: PrismaClient,
    private geocodingService: IGeocodingService,
    private paymentService: IPaymentService,
    private warehouseService: WarehouseService
  ) {}

  /**
   * Create a new order
   * Handles the complete order creation flow:
   * 1. Check idempotency key (if provided)
   * 2. Geocode shipping address
   * 3. Validate products exist
   * 4. Start transaction with row locking
   * 5. Find closest warehouse with locked inventory
   * 6. Process payment
   * 7. Deduct inventory and create order atomically
   * 8. Store idempotency record (if key provided)
   */
  async createOrder(validatedData: CreateOrderRequest): Promise<OrderResponse> {
    // Step 1: Check idempotency key if provided
    if (validatedData.idempotencyKey) {
      const cached = await this.checkIdempotency(validatedData.idempotencyKey);
      if (cached) {
        return cached;
      }
    }

    // Step 2: Geocode shipping address (outside transaction - external service)
    const coordinates = await this.geocodingService.geocode(
      validatedData.address
    );

    // Step 3: Validate products exist and fetch their data
    const products = await this.validateAndFetchProducts(validatedData.items);
    const totalAmount = this.calculateTotal(validatedData.items, products);

    // Step 4-7: Execute everything in a single transaction with row locking
    const result = await this.executeOrderTransaction(
      validatedData,
      products,
      coordinates,
      totalAmount
    );

    // Step 8: Store idempotency record if key was provided
    if (validatedData.idempotencyKey) {
      await this.storeIdempotencyRecord(
        validatedData.idempotencyKey,
        result.order.id,
        result.response
      );
    }

    return result.response;
  }

  /**
   * Check if an idempotency key has already been used
   * Returns the cached response if found and not expired
   */
  private async checkIdempotency(
    idempotencyKey: string
  ): Promise<OrderResponse | null> {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { idempotencyKey },
    });

    if (!record) {
      return null;
    }

    // Check if expired
    if (record.expiresAt < new Date()) {
      // Clean up expired record
      await this.prisma.idempotencyRecord.delete({
        where: { id: record.id },
      });
      return null;
    }

    // Return cached response (cast through unknown for Prisma Json type)
    return record.response as unknown as OrderResponse;
  }

  /**
   * Store idempotency record for future duplicate detection
   */
  private async storeIdempotencyRecord(
    idempotencyKey: string,
    orderId: string,
    response: OrderResponse
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_TTL_HOURS);

    await this.prisma.idempotencyRecord.create({
      data: {
        idempotencyKey,
        orderId,
        response: response as any, // Prisma Json type
        expiresAt,
      },
    });
  }

  /**
   * Execute the complete order flow in a single transaction with row locking.
   * This prevents race conditions by:
   * 1. Locking inventory rows with FOR UPDATE
   * 2. Selecting warehouse based on locked inventory
   * 3. Processing payment
   * 4. Deducting inventory and creating order atomically
   */
  private async executeOrderTransaction(
    validatedData: CreateOrderRequest,
    products: Product[],
    coordinates: { latitude: number; longitude: number },
    totalAmount: number
  ): Promise<{ order: { id: string }; response: OrderResponse }> {
    // Track payment for potential refund
    let paymentResult: PaymentResult | null = null;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Step 4: Find closest warehouse with locked inventory rows
          const warehouseSelection =
            await this.warehouseService.findClosestWarehouseWithLock(
              tx,
              validatedData.items,
              coordinates
            );
          const warehouse = warehouseSelection.warehouse;

          // Step 5: Process payment (inside transaction to ensure atomicity)
          // If payment fails, transaction rolls back automatically
          paymentResult = await this.processOrderPayment(
            validatedData,
            totalAmount
          );

          // Step 6: Deduct inventory (rows are already locked)
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

          // Step 7: Create Order with PAID status
          const newOrder = await tx.order.create({
            data: {
              customerEmail: validatedData.customer.email,
              shippingAddress: validatedData.address,
              totalAmount,
              status: OrderStatus.PAID,
              idempotencyKey: validatedData.idempotencyKey,
              warehouseId: warehouse.id,
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

          // Fetch complete order for response
          const orderWithItems = await tx.order.findUnique({
            where: { id: newOrder.id },
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
              closestWarehouseExcluded:
                warehouseSelection.closestWarehouseExcluded,
            },
            orderItems: orderWithItems.orderItems.map((item) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: item.priceAtPurchase,
            })),
          };

          return { order: newOrder, response };
        },
        {
          // Use serializable isolation for strongest consistency guarantees
          isolationLevel: "Serializable",
          // Increase timeout for complex transactions
          timeout: 30000,
        }
      );
    } catch (error) {
      // If payment was processed but transaction failed, attempt refund
      if (paymentResult?.success && paymentResult.transactionId) {
        await this.handleTransactionFailure(error, paymentResult, totalAmount);
      }
      throw error;
    }
  }

  private async validateAndFetchProducts(
    items: CreateOrderRequest["items"]
  ): Promise<Product[]> {
    // Validate quantity is a positive integer for each item
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BusinessError(
          `Quantity for product ${item.productId} must be a positive integer`,
          400,
          "INVALID_QUANTITY"
        );
      }
    }

    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new BusinessError(
        `Products not found: ${missingIds.join(", ")}`,
        404,
        "PRODUCTS_NOT_FOUND"
      );
    }

    return products;
  }

  private calculateTotal(
    items: CreateOrderRequest["items"],
    products: Product[]
  ): number {
    let totalAmount = 0;
    for (const item of items) {
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
    return totalAmount;
  }

  private async processOrderPayment(
    validatedData: CreateOrderRequest,
    totalAmount: number
  ) {
    const { creditCard } = validatedData.paymentDetails;
    const paymentResult = await this.paymentService.processPayment(
      creditCard,
      totalAmount,
      `Order for ${validatedData.customer.email}`
    );

    if (!paymentResult.success || !paymentResult.transactionId) {
      throw new BusinessError(
        "Payment processing failed",
        402,
        "PAYMENT_FAILED"
      );
    }

    return paymentResult;
  }

  private async handleTransactionFailure(
    error: unknown,
    paymentResult: { transactionId?: string },
    totalAmount: number
  ) {
    // Compensation Logic: Refund payment if database transaction fails
    console.error(
      "Order creation failed after payment. Initiating refund...",
      error
    );
    if (paymentResult.transactionId) {
      try {
        await this.paymentService.refundPayment(
          paymentResult.transactionId,
          totalAmount,
          "Order creation failed due to inventory/database error"
        );
        console.log(
          `Successfully refunded transaction ${paymentResult.transactionId}`
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
    }
  }
}
