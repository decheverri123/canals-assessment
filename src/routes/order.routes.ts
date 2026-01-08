/**
 * Order routes
 */

import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validateCreateOrder } from '../middlewares/validation.middleware';
import { asyncHandler } from '../middlewares/error-handler.middleware';
import { prisma } from '../config/database';

/**
 * Create order routes
 */
const router: Router = Router();

/**
 * Initialize order controller
 */
const orderController = new OrderController(prisma);

/**
 * POST /orders
 * Create a new order
 */
router.post(
  '/orders',
  validateCreateOrder,
  asyncHandler((req, res) => orderController.createOrder(req, res))
);

export default router;
