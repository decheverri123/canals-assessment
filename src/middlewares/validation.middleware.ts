/**
 * Validation middleware using Zod for request validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Zod schema for POST /orders request body
 */
export const createOrderSchema = z.object({
  customer: z.object({
    email: z.string().email('Invalid email address'),
  }),
  address: z.string().min(1, 'Address is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z
          .number()
          .int('Quantity must be an integer')
          .positive('Quantity must be a positive integer'),
      })
    )
    .min(1, 'At least one item is required'),
});

/**
 * Type inference from the schema
 */
export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

/**
 * Validation middleware for POST /orders
 * Validates request body and attaches parsed data to req.body
 */
export const validateCreateOrder = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const parsed = createOrderSchema.parse(req.body);
    // Attach validated and parsed data to request
    req.body = parsed;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    next(error);
  }
};
