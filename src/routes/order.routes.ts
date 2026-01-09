/**
 * Order routes
 */

import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { validateCreateOrder } from "../middlewares/validation.middleware";
import { asyncHandler } from "../middlewares/error-handler.middleware";
import { prisma } from "../config/database";
import { OrderService } from "../services/order.service";
import { GeocodingService } from "../services/geocoding.service";
import { PaymentService } from "../services/payment.service";
import { WarehouseService } from "../services/warehouse.service";

/**
 * Create order routes
 */
const router: Router = Router();

/**
 * Initialize services and controller
 */
const geocodingService = new GeocodingService();
const paymentService = new PaymentService();
const warehouseService = new WarehouseService(prisma);
const orderService = new OrderService(prisma, geocodingService, paymentService, warehouseService);
const orderController = new OrderController(orderService);

/**
 * GET /products
 * Get all available products
 */
router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      orderBy: {
        sku: "asc",
      },
    });
    res.json(products);
  })
);

/**
 * GET /warehouses
 * Get all warehouses with their inventory
 */
router.get(
  "/warehouses",
  asyncHandler(async (_req, res) => {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventory: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    res.json(warehouses);
  })
);

/**
 * POST /orders
 * Create a new order
 */
router.post(
  "/orders",
  validateCreateOrder,
  asyncHandler((req, res) => orderController.createOrder(req, res))
);

export default router;
