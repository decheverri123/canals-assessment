/**
 * Order controller for handling order creation
 */

import { Request, Response } from "express";
import { CreateOrderRequest } from "../middlewares/validation.middleware";
import { OrderService } from "../services/order.service";

/**
 * Order controller class
 */
export class OrderController {
  constructor(private orderService: OrderService) {}

  /**
   * Create a new order
   * Delegates logic to OrderService
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    const validatedData: CreateOrderRequest = req.body;
    const response = await this.orderService.createOrder(validatedData);
    res.status(201).json(response);
  }
}
