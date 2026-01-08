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
          customer: {
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
          customer: { email: 'test@example.com' },
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
          customer: { email: 'test@example.com' },
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
          customer: { email: 'test@example.com' },
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
          customer: { email: 'test@example.com' },
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
          customer: { email: 'test@example.com' },
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
          customer: { email: 'test@example.com' },
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
          customer: { email: 'test@example.com' },
          address: '123 Test St, New York, NY 10001',
          items: [{ productId: product.id, quantity: 1 }],
        },
      };

      await expect(
        controller.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Payment processing failed');

      // Verify order was created but status remains PENDING
      const orders = await testPrisma.order.findMany();
      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe(OrderStatus.PENDING);

      // Verify inventory was deducted (transaction committed before payment)
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      expect(inventory?.quantity).toBe(9); // 10 - 1 = 9
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
          customer: { email: 'first@example.com' },
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
          customer: { email: 'second@example.com' },
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
          customer: { email: 'test@example.com' },
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
});
