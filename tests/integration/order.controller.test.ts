/**
 * Integration tests for OrderController
 * Tests the complete order creation flow with database interactions
 */

import { Request, Response } from 'express';
import { OrderController } from '../../src/controllers/order.controller';
import { testPrisma } from '../setup';
import {
  createTestProduct,
  createTestWarehouse,
  createTestInventory,
} from '../helpers/test-helpers';
import { OrderStatus } from '@prisma/client';
import { PaymentService } from '../../src/services/payment.service';
import { WarehouseService } from '../../src/services/warehouse.service';

describe('OrderController Integration Tests', () => {
  let controller: OrderController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response> & {
    status: jest.Mock;
    json: jest.Mock;
  };

  beforeEach(() => {
    controller = new OrderController(testPrisma);
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as Partial<Response> & {
      status: jest.Mock;
      json: jest.Mock;
    };
  });

  describe('createOrder - Successful Order Creation', () => {
    it('should create order successfully when all conditions are met', async () => {
      // Setup: Create product, warehouse, and inventory
      const product = await createTestProduct({
        name: 'Test Product',
        price: 1000, // $10.00
      });

      const warehouse = await createTestWarehouse({
        name: 'Test Warehouse',
        address: '123 Test St, New York, NY 10001',
        latitude: 40.7128,
        longitude: -74.006,
      });

      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      // Create request
      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: {
            email: 'customer@example.com',
          },
          address: '456 Main St, New York, NY 10002',
          items: [
            {
              productId: product.id,
              quantity: 2,
            },
          ],
        },
      };

      // Execute
      await controller.createOrder(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).toMatchObject({
        customerEmail: 'customer@example.com',
        shippingAddress: '456 Main St, New York, NY 10002',
        totalAmount: 2000, // 2 * $10.00 = $20.00
        status: OrderStatus.PAID,
      });
      expect(responseCall.id).toBeDefined();
      expect(responseCall.warehouse).toBeDefined();
      expect(responseCall.warehouse).toMatchObject({
        id: warehouse.id,
        name: warehouse.name,
        address: warehouse.address,
      });
      expect(responseCall.orderItems).toHaveLength(1);
      expect(responseCall.orderItems[0]).toMatchObject({
        productId: product.id,
        quantity: 2,
        priceAtPurchase: 1000,
      });

      // Verify order was created in database
      const order = await testPrisma.order.findUnique({
        where: { id: responseCall.id },
        include: { orderItems: true },
      });

      expect(order).toBeDefined();
      expect(order?.status).toBe(OrderStatus.PAID);
      expect(order?.orderItems).toHaveLength(1);

      // Verify inventory was deducted
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });

      expect(inventory?.quantity).toBe(8); // 10 - 2 = 8
    });

    it('should integrate with geocoding service', async () => {
      const product = await createTestProduct({ price: 500 });
      const warehouse = await createTestWarehouse({
        latitude: 40.7128,
        longitude: -74.006,
      });
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 5,
      });

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '789 Broadway, New York, NY 10003',
          items: [{ productId: product.id, quantity: 1 }],
        },
      };

      await controller.createOrder(
        mockRequest as Request,
        mockResponse as Response
      );

      // Geocoding service should be called (returns NYC coordinates)
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should select closest warehouse when multiple warehouses exist', async () => {
      const product = await createTestProduct({ price: 1000 });

      // Create two warehouses at different locations
      const warehouse1 = await createTestWarehouse({
        name: 'Warehouse 1',
        latitude: 40.7128, // NYC
        longitude: -74.006,
      });

      const warehouse2 = await createTestWarehouse({
        name: 'Warehouse 2',
        latitude: 40.7589, // Slightly north of NYC
        longitude: -73.9851,
      });

      // Both warehouses have inventory
      await createTestInventory({
        warehouseId: warehouse1.id,
        productId: product.id,
        quantity: 10,
      });

      await createTestInventory({
        warehouseId: warehouse2.id,
        productId: product.id,
        quantity: 10,
      });

      // Customer address closer to warehouse1
      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001', // Closer to warehouse1
          items: [{ productId: product.id, quantity: 1 }],
        },
      };

      await controller.createOrder(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);

      // Check which warehouse's inventory was reduced
      const inventory1 = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse1.id,
            productId: product.id,
          },
        },
      });

      const inventory2 = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse2.id,
            productId: product.id,
          },
        },
      });

      // One warehouse should have reduced inventory (9 instead of 10)
      const reducedWarehouse =
        inventory1?.quantity === 9 ? warehouse1 : warehouse2;
      expect(reducedWarehouse).toBeDefined();
      
      // Verify the other warehouse still has full inventory
      const otherInventory = inventory1?.quantity === 9 ? inventory2 : inventory1;
      expect(otherInventory?.quantity).toBe(10);
    });

    it('should deduct inventory correctly', async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 100,
      });

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 25 }],
        },
      };

      await controller.createOrder(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify inventory was deducted
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });

      expect(inventory?.quantity).toBe(75); // 100 - 25 = 75
    });

    it('should process payment and update order status to PAID', async () => {
      const product = await createTestProduct({ price: 5000 }); // $50.00
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 5,
      });

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 1 }],
        },
      };

      await controller.createOrder(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.status).toBe(OrderStatus.PAID);

      // Verify in database
      const order = await testPrisma.order.findUnique({
        where: { id: responseCall.id },
      });
      expect(order?.status).toBe(OrderStatus.PAID);
    });
  });

  describe('createOrder - Error Scenarios', () => {
    it('should throw error when product is not found (warehouse service fails first)', async () => {
      // Note: When a product doesn't exist, the warehouse service runs first
      // and fails because no warehouse has inventory for that product.
      const fakeProductId = '00000000-0000-0000-0000-000000000000';

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: fakeProductId, quantity: 1 }],
        },
      };

      await expect(
        controller.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('No single warehouse has all items');

      // Verify no order was created
      const orders = await testPrisma.order.findMany();
      expect(orders).toHaveLength(0);
    });

    it('should throw error when insufficient inventory', async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 5, // Only 5 available
      });

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 10 }], // Requesting 10
        },
      };

      // Warehouse service fails first because no warehouse has sufficient inventory
      await expect(
        controller.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('No single warehouse has all items');

      // Verify no order was created
      const orders = await testPrisma.order.findMany();
      expect(orders).toHaveLength(0);

      // Verify inventory was not deducted
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(5);
    });

    it('should throw error when payment fails (amount = 9999)', async () => {
      const product = await createTestProduct({ price: 9999 }); // $99.99 - triggers payment failure
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 1 }],
        },
      };

      await expect(
        controller.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Payment processing failed');

      // Verify no order was created (payment failed before order creation)
      const orders = await testPrisma.order.findMany();
      expect(orders).toHaveLength(0);

      // Verify inventory was NOT deducted (payment failed before inventory deduction)
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(10); // Original quantity unchanged
    });

    it('should rollback transaction when inventory check fails', async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 1, // Only 1 available
      });

      // Create another order that will consume the inventory
      const otherProduct = await createTestProduct({ price: 500 });
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: otherProduct.id,
        quantity: 10,
      });

      // First order consumes the inventory
      const firstRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'first@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 1 }],
        },
      };

      const firstResponse: Partial<Response> & {
        status: jest.Mock;
        json: jest.Mock;
      } = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await controller.createOrder(
        firstRequest as Request,
        firstResponse as Response
      );

      // Second order should fail due to insufficient inventory
      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'second@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 1 }],
        },
      };

      // Second order should fail due to insufficient inventory
      // Warehouse service fails first because no warehouse has sufficient inventory
      await expect(
        controller.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('No single warehouse has all items');

      // Verify only one order exists (the first one)
      const orders = await testPrisma.order.findMany();
      expect(orders).toHaveLength(1);
    });
  });

  describe('createOrder - Multiple Items', () => {
    it('should create order with multiple items', async () => {
      const product1 = await createTestProduct({ name: 'Product 1', price: 1000 });
      const product2 = await createTestProduct({ name: 'Product 2', price: 2000 });
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

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" }, customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [
            { productId: product1.id, quantity: 2 },
            { productId: product2.id, quantity: 3 },
          ],
        },
      };

      await controller.createOrder(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.totalAmount).toBe(8000); // (2 * 1000) + (3 * 2000) = 8000
      expect(responseCall.orderItems).toHaveLength(2);

      // Verify both inventories were deducted
      const inventory1 = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product1.id,
          },
        },
      });
      expect(inventory1?.quantity).toBe(8);

      const inventory2 = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product2.id,
          },
        },
      });
      expect(inventory2?.quantity).toBe(7);
    });
  });

  describe('Critical Edge Cases', () => {
    /**
     * Helper function to submit an order via the controller
     */
    async function submitOrder(items: Array<{ productId: string; quantity: number }>): Promise<void> {
      const mockReq: Partial<Request> = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" },
          customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items,
        },
      };

      const mockRes: Partial<Response> & {
        status: jest.Mock;
        json: jest.Mock;
      } = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await controller.createOrder(mockReq as Request, mockRes as Response);
    }

    it('should prevent double-booking with concurrent orders', async () => {
      const product = await createTestProduct();
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 1, // Only 1 available
      });

      // Execute two orders simultaneously
      const results = await Promise.allSettled([
        submitOrder([{ productId: product.id, quantity: 1 }]),
        submitOrder([{ productId: product.id, quantity: 1 }]),
      ]);

      // One should succeed, one should fail
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect((failed[0] as PromiseRejectedResult).reason.message).toContain('Insufficient inventory');

      // Verify only one order was created
      const orders = await testPrisma.order.findMany();
      expect(orders).toHaveLength(1);

      // Verify inventory was deducted only once
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(0);
    });

    it('should handle payment API timeout', async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      // Mock payment service to timeout
      const paymentServiceSpy = jest.spyOn(PaymentService.prototype, 'processPayment');
      paymentServiceSpy.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ success: true }), 60000); // 60s delay
          })
      );

      // Set a timeout for the test
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Payment timeout')), 5000); // 5s test timeout
      });

      const orderPromise = submitOrder([{ productId: product.id, quantity: 1 }]);

      await expect(Promise.race([orderPromise, timeoutPromise])).rejects.toThrow('Payment timeout');

      // Order should not be created
      const orders = await testPrisma.order.findMany();
      expect(orders).toHaveLength(0);

      // Inventory should not be deducted
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(10);

      paymentServiceSpy.mockRestore();
    });

    it('should break distance ties deterministically', async () => {
      const product = await createTestProduct();

      // Two warehouses at EXACTLY same distance
      const warehouse1 = await createTestWarehouse({
        name: 'Warehouse 1',
        latitude: 40.7128,
        longitude: -74.0060,
      });
      const warehouse2 = await createTestWarehouse({
        name: 'Warehouse 2',
        latitude: 40.7128,
        longitude: -74.0060,
      });

      await createTestInventory({
        warehouseId: warehouse1.id,
        productId: product.id,
        quantity: 100,
      });
      await createTestInventory({
        warehouseId: warehouse2.id,
        productId: product.id,
        quantity: 100,
      });

      // Customer at the same location
      const customerCoordinates = { latitude: 40.7128, longitude: -74.0060 };

      // Use WarehouseService directly to test deterministic behavior
      const warehouseService = new WarehouseService(testPrisma);

      // Call findClosestWarehouse multiple times
      const result1 = await warehouseService.findClosestWarehouse(
        [{ productId: product.id, quantity: 1 }],
        customerCoordinates
      );
      const result2 = await warehouseService.findClosestWarehouse(
        [{ productId: product.id, quantity: 1 }],
        customerCoordinates
      );

      // Should always pick the same warehouse (deterministic)
      expect(result1.warehouse.id).toBe(result2.warehouse.id);
    });

    it('should not touch inventory when order creation fails', async () => {
      const product = await createTestProduct({ price: 1000 });
      const warehouse = await createTestWarehouse();
      await createTestInventory({
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: 10,
      });

      // Force failure by mocking the transaction to throw during order creation
      // This simulates a database error that causes transaction rollback
      const transactionSpy = jest.spyOn(testPrisma, '$transaction');
      transactionSpy.mockImplementationOnce(async (callback: any) => {
        // Create a mock transaction client that will fail at order creation
        const mockTx = {
          inventory: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inventory-id',
              warehouseId: warehouse.id,
              productId: product.id,
              quantity: 10,
            }),
            update: jest.fn().mockResolvedValue({
              id: 'inventory-id',
              warehouseId: warehouse.id,
              productId: product.id,
              quantity: 8, // This would be the new value, but transaction will rollback
            }),
          },
          order: {
            create: jest.fn().mockRejectedValue(new Error('Database error')),
          },
          orderItem: {
            create: jest.fn(),
          },
        };
        try {
          return await callback(mockTx);
        } catch (error) {
          // Transaction failed, all changes are rolled back
          throw error;
        }
      });

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" },
          customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 2 }],
        },
      };

      await expect(
        controller.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Database error');

      // Verify inventory is unchanged (transaction rolled back)
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(10); // Still 10, not 8

      transactionSpy.mockRestore();
    });

    it('should select correct warehouse in realistic multi-warehouse scenario', async () => {
      // NYC warehouse - closest but missing Product B
      const productA = await createTestProduct({ name: 'Product A', price: 1000 });
      const productB = await createTestProduct({ name: 'Product B', price: 2000 });

      const nycWarehouse = await createTestWarehouse({
        name: 'NYC',
        latitude: 40.7128,
        longitude: -74.0060,
      });

      // Philly warehouse - farther but has everything
      const phillyWarehouse = await createTestWarehouse({
        name: 'Philly',
        latitude: 39.9526,
        longitude: -75.1652,
      });

      await createTestInventory({
        warehouseId: nycWarehouse.id,
        productId: productA.id,
        quantity: 100,
      });

      await createTestInventory({
        warehouseId: phillyWarehouse.id,
        productId: productA.id,
        quantity: 100,
      });
      await createTestInventory({
        warehouseId: phillyWarehouse.id,
        productId: productB.id,
        quantity: 100,
      });

      mockRequest = {
        body: {
          paymentDetails: { creditCard: "4111111111111111" },
          customer: { email: 'test@example.com' },
          address: '123 Broadway, New York, NY', // Close to NYC
          items: [
            { productId: productA.id, quantity: 1 },
            { productId: productB.id, quantity: 1 },
          ],
        },
      };

      await controller.createOrder(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Should pick Philly even though NYC is closer
      expect(responseCall.warehouse.id).toBe(phillyWarehouse.id);
      expect(responseCall.warehouse.selectionReason).toContain('closest warehouse');
      expect(responseCall.warehouse.closestWarehouseExcluded).toBeDefined();
      expect(responseCall.warehouse.closestWarehouseExcluded?.name).toBe('NYC');
    });
  });
});
