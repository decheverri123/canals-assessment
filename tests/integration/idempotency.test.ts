/**
 * Integration tests for idempotency middleware
 * Verifies the Idempotency-Key header pattern works correctly
 */

import request from "supertest";
import { createApp } from "../../src/app";
import { testPrisma } from "../setup";
import {
  createTestProduct,
  createTestWarehouse,
  createTestInventory,
  wait,
} from "../helpers/test-helpers";

describe("Idempotency Middleware Integration Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  /**
   * Helper to create a valid order request with test data
   */
  async function setupOrderData() {
    const product = await createTestProduct({
      name: "Idempotency Test Product",
      price: 1000,
    });

    const warehouse = await createTestWarehouse({
      latitude: 40.7128,
      longitude: -74.006,
    });

    await createTestInventory({
      warehouseId: warehouse.id,
      productId: product.id,
      quantity: 100,
    });

    return {
      paymentDetails: { creditCard: "4111111111111111" },
      customer: { email: "idempotency-test@example.com" },
      address: "123 Test St, New York, NY 10001",
      items: [{ productId: product.id, quantity: 2 }],
    };
  }

  describe("First request with Idempotency-Key", () => {
    it("should create order and return 201", async () => {
      const orderData = await setupOrderData();
      const idempotencyKey = `test-key-${Date.now()}`;

      const response = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(orderData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.customerEmail).toBe("idempotency-test@example.com");
      expect(response.body.totalAmount).toBe(2000);

      // Wait briefly for async DB update to complete
      await wait(50);

      // Verify idempotency key was stored
      const storedKey = await testPrisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      expect(storedKey).toBeDefined();
      expect(storedKey?.responseStatus).toBe(201);
      expect(storedKey?.responseBody).toBeDefined();
    });
  });

  describe("Retry with same Idempotency-Key", () => {
    it("should return cached response without creating duplicate order", async () => {
      const orderData = await setupOrderData();
      const idempotencyKey = `test-key-${Date.now()}`;

      // First request - creates order
      const firstResponse = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(orderData)
        .expect(201);

      const firstOrderId = firstResponse.body.id;

      // Second request with same key - should return cached response
      const secondResponse = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(orderData)
        .expect(201);

      // Same order ID should be returned
      expect(secondResponse.body.id).toBe(firstOrderId);

      // Verify only one order was created
      const orderCount = await testPrisma.order.count({
        where: { customerEmail: "idempotency-test@example.com" },
      });
      expect(orderCount).toBe(1);
    });
  });

  describe("In-flight request detection", () => {
    it("should return 409 when idempotency key is locked (in-flight)", async () => {
      const orderData = await setupOrderData();
      const idempotencyKey = `in-flight-test-${Date.now()}`;

      // Manually insert a "locked" record (no response status)
      await testPrisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          requestParams: orderData,
          createdAt: new Date(),
          lockedAt: new Date(),
          // responseStatus and responseBody are null (in-flight)
        },
      });

      // Request with the locked key should return 409
      const response = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(orderData)
        .expect(409);

      expect(response.body.error).toContain("already in progress");
      expect(response.body.code).toBe("IDEMPOTENCY_IN_FLIGHT");
    });
  });

  describe("Request without Idempotency-Key", () => {
    it("should proceed normally and create order", async () => {
      const orderData = await setupOrderData();

      // No Idempotency-Key header
      const response = await request(app)
        .post("/orders")
        .send(orderData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.customerEmail).toBe("idempotency-test@example.com");

      // No idempotency key should be stored
      const keyCount = await testPrisma.idempotencyKey.count();
      expect(keyCount).toBe(0);
    });
  });
});
