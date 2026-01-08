/**
 * Test helpers and factory functions for generating test data
 * Provides utilities for creating test entities and common test operations
 */

import { PrismaClient, OrderStatus } from "@prisma/client";
import { testPrisma } from "../setup";

/**
 * Factory function to create a test product
 */
export interface CreateProductData {
  sku?: string;
  name?: string;
  price?: number;
}

export async function createTestProduct(
  data: CreateProductData = {}
): Promise<{ id: string; sku: string; name: string; price: number }> {
  const product = await testPrisma.product.create({
    data: {
      sku:
        data.sku ||
        `SKU-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: data.name || "Test Product",
      price: data.price ?? 1000, // Default to $10.00 (in cents)
    },
  });
  return product;
}

/**
 * Factory function to create a test warehouse
 */
export interface CreateWarehouseData {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export async function createTestWarehouse(
  data: CreateWarehouseData = {}
): Promise<{
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}> {
  const warehouse = await testPrisma.warehouse.create({
    data: {
      name: data.name || "Test Warehouse",
      address: data.address || "123 Test St, New York, NY 10001",
      latitude: data.latitude ?? 40.7128, // Default to NYC coordinates
      longitude: data.longitude ?? -74.006,
    },
  });
  return warehouse;
}

/**
 * Factory function to create test inventory
 */
export interface CreateInventoryData {
  warehouseId: string;
  productId: string;
  quantity?: number;
}

export async function createTestInventory(data: CreateInventoryData): Promise<{
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
}> {
  const inventory = await testPrisma.inventory.create({
    data: {
      warehouseId: data.warehouseId,
      productId: data.productId,
      quantity: data.quantity ?? 100,
    },
  });
  return inventory;
}

/**
 * Factory function to create a test order
 */
export interface CreateOrderData {
  customerEmail?: string;
  shippingAddress?: string;
  totalAmount?: number;
  status?: OrderStatus;
}

export async function createTestOrder(data: CreateOrderData = {}): Promise<{
  id: string;
  customerEmail: string;
  shippingAddress: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
}> {
  const order = await testPrisma.order.create({
    data: {
      customerEmail: data.customerEmail || "test@example.com",
      shippingAddress:
        data.shippingAddress || "123 Test St, New York, NY 10001",
      totalAmount: data.totalAmount ?? 1000,
      status: data.status ?? OrderStatus.PENDING,
    },
  });
  return order;
}

/**
 * Factory function to create a test order item
 */
export interface CreateOrderItemData {
  orderId: string;
  productId: string;
  quantity?: number;
  priceAtPurchase?: number;
}

export async function createTestOrderItem(data: CreateOrderItemData): Promise<{
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
}> {
  const orderItem = await testPrisma.orderItem.create({
    data: {
      orderId: data.orderId,
      productId: data.productId,
      quantity: data.quantity ?? 1,
      priceAtPurchase: data.priceAtPurchase ?? 1000,
    },
  });
  return orderItem;
}

/**
 * Helper to create a complete order with items
 */
export interface CreateOrderWithItemsData {
  customerEmail?: string;
  shippingAddress?: string;
  items: Array<{
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
  status?: OrderStatus;
}

export async function createTestOrderWithItems(
  data: CreateOrderWithItemsData
): Promise<{
  order: {
    id: string;
    customerEmail: string;
    shippingAddress: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: Date;
  };
  orderItems: Array<{
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
}> {
  const totalAmount = data.items.reduce(
    (sum, item) => sum + item.priceAtPurchase * item.quantity,
    0
  );

  const order = await createTestOrder({
    customerEmail: data.customerEmail,
    shippingAddress: data.shippingAddress,
    totalAmount,
    status: data.status,
  });

  const orderItems = await Promise.all(
    data.items.map((item) =>
      createTestOrderItem({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
      })
    )
  );

  return { order, orderItems };
}

/**
 * Helper to create a warehouse with inventory
 */
export interface CreateWarehouseWithInventoryData {
  warehouse?: CreateWarehouseData;
  inventory: Array<{
    productId: string;
    quantity: number;
  }>;
}

export async function createTestWarehouseWithInventory(
  data: CreateWarehouseWithInventoryData
): Promise<{
  warehouse: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  inventory: Array<{
    id: string;
    warehouseId: string;
    productId: string;
    quantity: number;
  }>;
}> {
  const warehouse = await createTestWarehouse(data.warehouse);

  const inventory = await Promise.all(
    data.inventory.map((item) =>
      createTestInventory({
        warehouseId: warehouse.id,
        productId: item.productId,
        quantity: item.quantity,
      })
    )
  );

  return { warehouse, inventory };
}

/**
 * Common test assertions
 */

/**
 * Assert that two numbers are approximately equal (within a tolerance)
 */
export function expectApproximatelyEqual(
  actual: number,
  expected: number,
  tolerance: number = 0.01
): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that a date is recent (within the last minute)
 */
export function expectRecentDate(date: Date): void {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  expect(diff).toBeLessThan(60000); // Less than 1 minute
}

/**
 * Helper to wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
