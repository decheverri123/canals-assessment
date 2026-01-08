/**
 * Order-related types and interfaces
 */

import { OrderStatus } from '@prisma/client';

/**
 * Order status enum (re-exported from Prisma)
 */
export { OrderStatus };

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
  orderItems: OrderItemResponse[];
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
