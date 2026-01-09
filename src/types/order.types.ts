/**
 * Order-related types and interfaces
 */

import { OrderStatus } from "@prisma/client";

/**
 * Order status enum (re-exported from Prisma)
 */
export { OrderStatus };

/**
 * Warehouse information in order response
 */
export interface WarehouseResponse {
  id: string;
  name: string;
  address: string;
}

/**
 * Order item response type
 */
export interface OrderItemResponse {
  id: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
}

/**
 * Order response type with order items
 */
export interface OrderResponse {
  id: string;
  customerEmail: string;
  shippingAddress: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  warehouse: WarehouseResponse;
  orderItems: OrderItemResponse[];
}
