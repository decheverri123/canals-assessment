/**
 * Order controller for handling order creation
 */

import { Request, Response } from "express";
import { CreateOrderRequest } from "../middlewares/validation.middleware";
import { OrderService } from "../services/order.service";
import { IdempotencyService } from "../services/idempotency.service";
import { BusinessError } from "../middlewares/error-handler.middleware";

/**
 * Order controller class
 */
export class OrderController {
  constructor(
    private orderService: OrderService,
    private idempotencyService: IdempotencyService
  ) {}

  /**
   * Create a new order
   * Delegates logic to OrderService
   *
   * Handles idempotency state updates:
   * - On 201 success: marks idempotency as COMPLETED
   * - On 4xx deterministic error: marks idempotency as FAILED
   * - On 5xx error: does NOT update idempotency (allows retry via stale-lock)
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    const validatedData: CreateOrderRequest = req.body;
    const idempotencyContext = req.idempotency;

    try {
      const response = await this.orderService.createOrder(validatedData);

      // Update idempotency state to COMPLETED before sending response
      if (idempotencyContext) {
        await this.idempotencyService.completeRequest(
          idempotencyContext.id,
          201,
          response
        );
      }

      res.status(201).json(response);
    } catch (error) {
      // Handle deterministic business errors (4xx) - cache these
      if (error instanceof BusinessError && error.statusCode < 500) {
        const errorResponse = {
          error: error.message,
          code: error.code,
        };

        if (idempotencyContext) {
          await this.idempotencyService.failRequest(
            idempotencyContext.id,
            error.statusCode,
            errorResponse
          );
        }

        res.status(error.statusCode).json(errorResponse);
        return;
      }

      // For 5xx errors or unexpected errors, do NOT update idempotency
      // This allows the stale-lock mechanism to enable retry
      throw error;
    }
  }
}
