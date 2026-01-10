/**
 * Integration tests for order routes using supertest
 * Tests HTTP endpoints and middleware integration
 */

import request from "supertest";
import { createApp } from "../../src/app";
import { testPrisma } from "../setup";
import {
  createTestProduct,
  createTestWarehouse,
  createTestInventory,
} from "../helpers/test-helpers";
import { OrderStatus } from "@prisma/client";

describe("Order Routes Integration Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  describe("GET /products", () => {
    it("should return all products sorted by SKU", async () => {
      // Create test products
      const product1 = await createTestProduct({
        sku: "PROD-002",
        name: "Product B",
        price: 2000,
      });

      const product2 = await createTestProduct({
        sku: "PROD-001",
        name: "Product A",
        price: 1000,
      });

      const response = await request(app).get("/products").expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Verify products are sorted by SKU
      const productSkus = response.body.map((p: { sku: string }) => p.sku);
      expect(productSkus).toEqual(
        expect.arrayContaining(["PROD-001", "PROD-002"])
      );

      // Verify product structure for both products
      const foundProduct1 = response.body.find(
        (p: { id: string }) => p.id === product1.id
      );
      expect(foundProduct1).toMatchObject({
        id: product1.id,
        sku: "PROD-002",
        name: "Product B",
        price: 2000,
      });

      const foundProduct2 = response.body.find(
        (p: { id: string }) => p.id === product2.id
      );
      expect(foundProduct2).toMatchObject({
        id: product2.id,
        sku: "PROD-001",
        name: "Product A",
        price: 1000,
      });
    });
  });

  describe("POST /orders - Success Cases", () => {
    it("should create order successfully with valid request", async () => {
      // Setup test data
      const product = await createTestProduct({
        name: "Test Product",
        price: 1000,
      });

      const warehouse = await createTestWarehouse({
        latitude: 40.7128,
        longitude: -74.006,
      });

      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: {
          email: "customer@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        customerEmail: "customer@example.com",
        shippingAddress: "123 Main St, New York, NY 10001",
        totalAmount: 2000,
        status: OrderStatus.PAID,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.orderItems).toBeInstanceOf(Array);
      expect(response.body.orderItems).toHaveLength(1);
      expect(response.body.orderItems[0]).toMatchObject({
        productId: product.id,
        quantity: 2,
        priceAtPurchase: 1000,
      });

      // Verify order was created in database
      const order = await testPrisma.order.findUnique({
        where: { id: response.body.id },
      });
      expect(order).toBeDefined();
      expect(order?.status).toBe(OrderStatus.PAID);
    });

    it("should handle multiple items in order", async () => {
      const product1 = await createTestProduct({ price: 1000 });
      const product2 = await createTestProduct({ price: 2000 });
      const warehouse = await createTestWarehouse();

      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product1.id,
        quantity: 10,
      });

      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product2.id,
        quantity: 10,
      });

      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: {
          email: "customer@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          { productId: product1.id, quantity: 2 },
          { productId: product2.id, quantity: 3 },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(201);

      expect(response.body.totalAmount).toBe(8000); // (2 * 1000) + (3 * 2000)
      expect(response.body.orderItems).toHaveLength(2);
    });
  });

  describe("POST /orders - Validation Errors", () => {
    it("should return 400 when quantity is a fractional number", async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: {
          email: "test@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: product.id,
            quantity: 5.6, // Fractional quantity should be rejected
          },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details[0].message).toContain("integer");
    });

    it("should return 400 when quantity is zero", async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: {
          email: "test@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: product.id,
            quantity: 0, // Zero quantity should be rejected
          },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Validation failed");
    });

    it("should return 400 when quantity is negative", async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: {
          email: "test@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: product.id,
            quantity: -1, // Negative quantity should be rejected
          },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Validation failed");
    });
  });

  describe("POST /orders - Business Logic Errors", () => {
    it("should return 400 when insufficient inventory", async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 5, // Only 5 available
      });

      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: {
          email: "test@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: product.id,
            quantity: 10, // Requesting 10
          },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      // When insufficient inventory, warehouse service throws split shipment error
      // because no warehouse has enough inventory
      expect(response.body.error).toContain(
        "No single warehouse has all items in sufficient quantity"
      );
    });

    it("should return 402 when payment fails", async () => {
      const product = await createTestProduct({ price: 9999 }); // $99.99 - triggers payment failure
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: {
          email: "test@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(402);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Payment processing failed");
    });
  });

  describe("POST /orders - Idempotency", () => {
    it("should return same response for duplicate requests with same idempotency key", async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      const idempotencyKey = `test-key-${Date.now()}`;
      const orderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: { email: "idempotent@example.com" },
        address: "123 Main St, New York, NY 10001",
        items: [{ productId: product.id, quantity: 2 }],
        idempotencyKey,
      };

      // First request - should create order
      const response1 = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(201);

      expect(response1.body.id).toBeDefined();
      const firstOrderId = response1.body.id;

      // Second request with same idempotency key - should return cached response
      const response2 = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(201);

      expect(response2.body.id).toBe(firstOrderId);
      expect(response2.body.totalAmount).toBe(response1.body.totalAmount);

      // Verify only one order was created
      const orders = await testPrisma.order.findMany({
        where: { customerEmail: "idempotent@example.com" },
      });
      expect(orders).toHaveLength(1);

      // Verify inventory was only deducted once
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(8); // 10 - 2 = 8 (only one deduction)
    });

    it("should create separate orders for different idempotency keys", async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 20,
      });

      const baseOrderData = {
        paymentDetails: { creditCard: "4111111111111111" },
        customer: { email: "different-keys@example.com" },
        address: "123 Main St, New York, NY 10001",
        items: [{ productId: product.id, quantity: 2 }],
      };

      // First request with key 1
      const response1 = await request(app)
        .post("/orders")
        .send({ ...baseOrderData, idempotencyKey: "key-1" })
        .expect(201);

      // Second request with key 2 - should create new order
      const response2 = await request(app)
        .post("/orders")
        .send({ ...baseOrderData, idempotencyKey: "key-2" })
        .expect(201);

      expect(response1.body.id).not.toBe(response2.body.id);

      // Verify two orders were created
      const orders = await testPrisma.order.findMany({
        where: { customerEmail: "different-keys@example.com" },
      });
      expect(orders).toHaveLength(2);

      // Verify inventory was deducted twice
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(16); // 20 - 2 - 2 = 16
    });
  });
});
