/**
 * Integration tests for idempotency middleware
 * Verifies the Idempotency-Key header pattern works correctly
 */

import request from "supertest";
import { createApp } from "../../src/app";
import { testPrisma } from "../setup";
import { IdempotencyStatus } from "@prisma/client";
import {
  createTestProduct,
  createTestWarehouse,
  createTestInventory,
} from "../helpers/test-helpers";
import { computeRequestHash } from "../../src/utils/request-hash";
import { STALE_LOCK_THRESHOLD_MS } from "../../src/types/idempotency.types";

describe("Idempotency Middleware Integration Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  /**
   * Helper to create a valid order request with test data
   */
  async function setupOrderData(email = "idempotency-test@example.com") {
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
      customer: { email },
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

      // Verify idempotency key was stored with correct data
      const storedKey = await testPrisma.idempotencyKey.findUnique({
        where: {
          customerKey_key: {
            customerKey: orderData.customer.email,
            key: idempotencyKey,
          },
        },
      });

      expect(storedKey).toBeDefined();
      expect(storedKey?.status).toBe(IdempotencyStatus.COMPLETED);
      expect(storedKey?.responseStatus).toBe(201);
      expect(storedKey?.responseBody).toBeDefined();
      // Verify sensitive data is NOT stored
      expect(storedKey?.requestHash).toBeDefined();
      expect((storedKey?.responseBody as any)?.paymentDetails).toBeUndefined();
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
      const requestHash = computeRequestHash(orderData);

      // Manually insert a "locked" record (PROCESSING status)
      await testPrisma.idempotencyKey.create({
        data: {
          customerKey: orderData.customer.email,
          key: idempotencyKey,
          requestHash,
          status: IdempotencyStatus.PROCESSING,
          lockedAt: new Date(), // Fresh lock
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

  describe("Stale lock takeover", () => {
    it("should allow takeover and reprocessing when lock is stale (>30s)", async () => {
      const orderData = await setupOrderData();
      const idempotencyKey = `stale-lock-test-${Date.now()}`;
      const requestHash = computeRequestHash(orderData);

      // Create a stale locked record (lockedAt is older than threshold)
      const staleTime = new Date(Date.now() - STALE_LOCK_THRESHOLD_MS - 1000);
      await testPrisma.idempotencyKey.create({
        data: {
          customerKey: orderData.customer.email,
          key: idempotencyKey,
          requestHash,
          status: IdempotencyStatus.PROCESSING,
          lockedAt: staleTime,
        },
      });

      // Request should succeed (takeover the stale lock)
      const response = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(orderData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.customerEmail).toBe("idempotency-test@example.com");

      // Verify the record was updated to COMPLETED
      const storedKey = await testPrisma.idempotencyKey.findUnique({
        where: {
          customerKey_key: {
            customerKey: orderData.customer.email,
            key: idempotencyKey,
          },
        },
      });

      expect(storedKey?.status).toBe(IdempotencyStatus.COMPLETED);
      expect(storedKey?.responseStatus).toBe(201);
    });
  });

  describe("Customer-scoped keys", () => {
    it("should allow same idempotency key for different customers", async () => {
      const sharedKey = `shared-key-${Date.now()}`;

      // Setup data for two different customers
      const customer1Data = await setupOrderData("customer1@example.com");
      const customer2Data = await setupOrderData("customer2@example.com");

      // First customer uses the key
      const response1 = await request(app)
        .post("/orders")
        .set("Idempotency-Key", sharedKey)
        .send(customer1Data)
        .expect(201);

      // Second customer uses the same key - should work independently
      const response2 = await request(app)
        .post("/orders")
        .set("Idempotency-Key", sharedKey)
        .send(customer2Data)
        .expect(201);

      // Both should have different order IDs
      expect(response1.body.id).not.toBe(response2.body.id);

      // Verify two separate idempotency records exist
      const keyCount = await testPrisma.idempotencyKey.count({
        where: { key: sharedKey },
      });
      expect(keyCount).toBe(2);

      // Verify two separate orders were created
      const orderCount = await testPrisma.order.count();
      expect(orderCount).toBe(2);
    });
  });

  describe("Request hash mismatch detection", () => {
    it("should return 422 when same key is used with different request body", async () => {
      const orderData = await setupOrderData();
      const idempotencyKey = `hash-mismatch-test-${Date.now()}`;

      // First request
      await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(orderData)
        .expect(201);

      // Second request with same key but different quantity
      const modifiedData = {
        ...orderData,
        items: [{ ...orderData.items[0], quantity: 5 }],
      };

      const response = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(modifiedData)
        .expect(422);

      expect(response.body.code).toBe("IDEMPOTENCY_PARAMS_MISMATCH");
    });

    it("should NOT detect mismatch when only paymentDetails differ", async () => {
      const orderData = await setupOrderData();
      const idempotencyKey = `payment-change-test-${Date.now()}`;

      // First request
      const firstResponse = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(orderData)
        .expect(201);

      // Second request with different credit card (should return cached - card not in hash)
      const modifiedData = {
        ...orderData,
        paymentDetails: { creditCard: "5555555555554444" },
      };

      const secondResponse = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(modifiedData)
        .expect(201);

      // Should return the same cached response
      expect(secondResponse.body.id).toBe(firstResponse.body.id);
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

  describe("Validation before idempotency", () => {
    it("should NOT create idempotency record for invalid requests", async () => {
      const idempotencyKey = `invalid-request-${Date.now()}`;

      // Send invalid request (missing required fields)
      await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send({ invalid: "data" })
        .expect(400);

      // No idempotency record should be created
      const keyCount = await testPrisma.idempotencyKey.count();
      expect(keyCount).toBe(0);
    });
  });

  describe("Deterministic error caching", () => {
    it("should cache deterministic 4xx errors", async () => {
      const orderData = await setupOrderData();
      const idempotencyKey = `error-cache-test-${Date.now()}`;

      // Use a valid UUID format but non-existent product ID
      // The warehouse service checks inventory first and throws 400 SPLIT_SHIPMENT_NOT_SUPPORTED
      // when no warehouse can fulfill the order
      const nonExistentProductId = "00000000-0000-0000-0000-000000000000";
      const invalidData = {
        ...orderData,
        items: [{ productId: nonExistentProductId, quantity: 1 }],
      };

      // First request - should fail with 400 (no warehouse can fulfill order)
      const firstResponse = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(invalidData)
        .expect(400);

      expect(firstResponse.body.code).toBe("SPLIT_SHIPMENT_NOT_SUPPORTED");

      // Second request - should return cached error
      const secondResponse = await request(app)
        .post("/orders")
        .set("Idempotency-Key", idempotencyKey)
        .send(invalidData)
        .expect(400);

      expect(secondResponse.body).toEqual(firstResponse.body);

      // Verify record is marked as FAILED
      const storedKey = await testPrisma.idempotencyKey.findUnique({
        where: {
          customerKey_key: {
            customerKey: invalidData.customer.email,
            key: idempotencyKey,
          },
        },
      });

      expect(storedKey?.status).toBe(IdempotencyStatus.FAILED);
    });
  });
});
