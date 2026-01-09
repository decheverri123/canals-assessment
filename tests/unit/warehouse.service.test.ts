/**
 * Unit tests for WarehouseService
 */

import { WarehouseService } from "../../src/services/warehouse.service";
import { testPrisma } from "../setup";
import {
  createTestProduct,
  createTestWarehouse,
  createTestInventory,
} from "../helpers/test-helpers";
import { BusinessError } from "../../src/middlewares/error-handler.middleware";
import { Coordinates } from "../../src/types/coordinates.types";

describe("WarehouseService", () => {
  let warehouseService: WarehouseService;

  beforeEach(() => {
    warehouseService = new WarehouseService(testPrisma);
  });

  describe("findClosestWarehouse", () => {
    describe("single warehouse scenarios", () => {
      it("should find the closest warehouse when only one warehouse exists", async () => {
        // Create a product
        const product = await createTestProduct({
          name: "Test Product",
          price: 1000,
        });

        // Create a warehouse
        const warehouse = await createTestWarehouse({
          name: "Warehouse 1",
          latitude: 40.7128,
          longitude: -74.006,
        });

        // Add inventory
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 100,
        });

        // Customer coordinates (close to warehouse)
        const customerCoordinates: Coordinates = {
          latitude: 40.7138,
          longitude: -74.007,
        };

        const result = await warehouseService.findClosestWarehouse(
          [{ productId: product.id, quantity: 10 }],
          customerCoordinates
        );

        expect(result.warehouse.id).toBe(warehouse.id);
        expect(result.warehouse.name).toBe(warehouse.name);
        expect(result.warehouse.address).toBe(warehouse.address);
        expect(result.warehouse.latitude).toBe(warehouse.latitude);
        expect(result.warehouse.longitude).toBe(warehouse.longitude);
        expect(result.selectionReason).toBeDefined();
        expect(result.distanceKm).toBeGreaterThanOrEqual(0);
      });

      it("should return warehouse with exact inventory match", async () => {
        const product = await createTestProduct();
        const warehouse = await createTestWarehouse();
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 50,
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        const result = await warehouseService.findClosestWarehouse(
          [{ productId: product.id, quantity: 50 }],
          customerCoordinates
        );

        expect(result.warehouse.id).toBe(warehouse.id);
      });
    });

    describe("multiple warehouses with distance sorting", () => {
      it("should select the closest warehouse when multiple warehouses have inventory", async () => {
        const product = await createTestProduct();

        // Create warehouse 1 (NYC - closer to customer)
        const warehouse1 = await createTestWarehouse({
          name: "NYC Warehouse",
          latitude: 40.7128,
          longitude: -74.006,
        });

        // Create warehouse 2 (Philadelphia - farther from customer)
        const warehouse2 = await createTestWarehouse({
          name: "Philly Warehouse",
          latitude: 39.9526,
          longitude: -75.1652,
        });

        // Add inventory to both warehouses
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

        // Customer coordinates (closer to NYC)
        const customerCoordinates: Coordinates = {
          latitude: 40.7138,
          longitude: -74.007,
        };

        const result = await warehouseService.findClosestWarehouse(
          [{ productId: product.id, quantity: 10 }],
          customerCoordinates
        );

        // Should select NYC warehouse (closer)
        expect(result.warehouse.id).toBe(warehouse1.id);
        expect(result.warehouse.name).toBe("NYC Warehouse");
      });

      it("should select closest warehouse when warehouses are at different distances", async () => {
        const product = await createTestProduct();

        // Create three warehouses at different locations
        const warehouse1 = await createTestWarehouse({
          name: "Close Warehouse",
          latitude: 40.7128,
          longitude: -74.006,
        });
        const warehouse2 = await createTestWarehouse({
          name: "Medium Warehouse",
          latitude: 40.7589,
          longitude: -73.9851,
        });
        const warehouse3 = await createTestWarehouse({
          name: "Far Warehouse",
          latitude: 34.0522,
          longitude: -118.2437, // Los Angeles
        });

        // Add inventory to all warehouses
        await Promise.all([
          createTestInventory({
            warehouseId: warehouse1.id,
            productId: product.id,
            quantity: 100,
          }),
          createTestInventory({
            warehouseId: warehouse2.id,
            productId: product.id,
            quantity: 100,
          }),
          createTestInventory({
            warehouseId: warehouse3.id,
            productId: product.id,
            quantity: 100,
          }),
        ]);

        // Customer coordinates (close to warehouse1)
        const customerCoordinates: Coordinates = {
          latitude: 40.7138,
          longitude: -74.007,
        };

        const result = await warehouseService.findClosestWarehouse(
          [{ productId: product.id, quantity: 10 }],
          customerCoordinates
        );

        // Should select the closest warehouse
        expect(result.warehouse.id).toBe(warehouse1.id);
      });

      it("should handle multiple products and select closest warehouse with all items", async () => {
        const product1 = await createTestProduct({ name: "Product 1" });
        const product2 = await createTestProduct({ name: "Product 2" });

        // Warehouse 1 has both products (closer)
        const warehouse1 = await createTestWarehouse({
          name: "Close Warehouse",
          latitude: 40.7128,
          longitude: -74.006,
        });

        // Warehouse 2 has both products (farther)
        const warehouse2 = await createTestWarehouse({
          name: "Far Warehouse",
          latitude: 34.0522,
          longitude: -118.2437,
        });

        // Add inventory to warehouse 1
        await createTestInventory({
          warehouseId: warehouse1.id,
          productId: product1.id,
          quantity: 100,
        });
        await createTestInventory({
          warehouseId: warehouse1.id,
          productId: product2.id,
          quantity: 100,
        });

        // Add inventory to warehouse 2
        await createTestInventory({
          warehouseId: warehouse2.id,
          productId: product1.id,
          quantity: 100,
        });
        await createTestInventory({
          warehouseId: warehouse2.id,
          productId: product2.id,
          quantity: 100,
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7138,
          longitude: -74.007,
        };

        const result = await warehouseService.findClosestWarehouse(
          [
            { productId: product1.id, quantity: 10 },
            { productId: product2.id, quantity: 20 },
          ],
          customerCoordinates
        );

        // Should select warehouse 1 (closer and has both products)
        expect(result.warehouse.id).toBe(warehouse1.id);
      });
    });

    describe("insufficient inventory scenarios", () => {
      it("should throw error when no warehouse has sufficient inventory for a product", async () => {
        const product = await createTestProduct();
        const warehouse = await createTestWarehouse();

        // Add inventory with quantity less than requested
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 5,
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        await expect(
          warehouseService.findClosestWarehouse(
            [{ productId: product.id, quantity: 10 }],
            customerCoordinates
          )
        ).rejects.toThrow(BusinessError);
      });

      it("should throw error when warehouse has zero inventory", async () => {
        const product = await createTestProduct();
        const warehouse = await createTestWarehouse();

        // Add inventory with zero quantity
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 0,
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        await expect(
          warehouseService.findClosestWarehouse(
            [{ productId: product.id, quantity: 1 }],
            customerCoordinates
          )
        ).rejects.toThrow(BusinessError);
      });

      it("should throw error when product has no inventory in any warehouse", async () => {
        const product = await createTestProduct();

        // Don't add any inventory for this product

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        await expect(
          warehouseService.findClosestWarehouse(
            [{ productId: product.id, quantity: 1 }],
            customerCoordinates
          )
        ).rejects.toThrow(BusinessError);
      });
    });

    describe("split shipment error", () => {
      it("should throw split shipment error when no single warehouse has all items", async () => {
        const product1 = await createTestProduct({ name: "Product 1" });
        const product2 = await createTestProduct({ name: "Product 2" });

        // Warehouse 1 has only product1
        const warehouse1 = await createTestWarehouse({
          name: "Warehouse 1",
        });
        await createTestInventory({
          warehouseId: warehouse1.id,
          productId: product1.id,
          quantity: 100,
        });

        // Warehouse 2 has only product2
        const warehouse2 = await createTestWarehouse({
          name: "Warehouse 2",
        });
        await createTestInventory({
          warehouseId: warehouse2.id,
          productId: product2.id,
          quantity: 100,
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        await expect(
          warehouseService.findClosestWarehouse(
            [
              { productId: product1.id, quantity: 10 },
              { productId: product2.id, quantity: 10 },
            ],
            customerCoordinates
          )
        ).rejects.toThrow(BusinessError);

        // Verify it's the correct error
        try {
          await warehouseService.findClosestWarehouse(
            [
              { productId: product1.id, quantity: 10 },
              { productId: product2.id, quantity: 10 },
            ],
            customerCoordinates
          );
        } catch (error) {
          expect(error).toBeInstanceOf(BusinessError);
          expect((error as BusinessError).code).toBe(
            "SPLIT_SHIPMENT_NOT_SUPPORTED"
          );
          expect((error as BusinessError).statusCode).toBe(400);
        }
      });

      it("should throw split shipment error when items are split across multiple warehouses", async () => {
        const product1 = await createTestProduct();
        const product2 = await createTestProduct();
        const product3 = await createTestProduct();

        // Warehouse 1 has product1 and product2
        const warehouse1 = await createTestWarehouse();
        await createTestInventory({
          warehouseId: warehouse1.id,
          productId: product1.id,
          quantity: 100,
        });
        await createTestInventory({
          warehouseId: warehouse1.id,
          productId: product2.id,
          quantity: 100,
        });

        // Warehouse 2 has product2 and product3
        const warehouse2 = await createTestWarehouse();
        await createTestInventory({
          warehouseId: warehouse2.id,
          productId: product2.id,
          quantity: 100,
        });
        await createTestInventory({
          warehouseId: warehouse2.id,
          productId: product3.id,
          quantity: 100,
        });

        // No single warehouse has all three products
        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        await expect(
          warehouseService.findClosestWarehouse(
            [
              { productId: product1.id, quantity: 10 },
              { productId: product2.id, quantity: 10 },
              { productId: product3.id, quantity: 10 },
            ],
            customerCoordinates
          )
        ).rejects.toThrow(BusinessError);
      });
    });

    describe("edge cases", () => {
      it("should handle empty order items array", async () => {
        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        // Empty items array - should find any warehouse (or throw if no warehouses)
        const warehouse = await createTestWarehouse();

        // With empty items, all warehouses should match
        const result = await warehouseService.findClosestWarehouse(
          [],
          customerCoordinates
        );

        expect(result).toBeDefined();
        expect(result.warehouse.id).toBe(warehouse.id);
      });

      it("should handle zero quantity (edge case)", async () => {
        const product = await createTestProduct();
        const warehouse = await createTestWarehouse();
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 100,
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        // Zero quantity should still work (warehouse has inventory >= 0)
        const result = await warehouseService.findClosestWarehouse(
          [{ productId: product.id, quantity: 0 }],
          customerCoordinates
        );

        expect(result.warehouse.id).toBe(warehouse.id);
      });

      it("should handle multiple items where one has insufficient inventory", async () => {
        const product1 = await createTestProduct();
        const product2 = await createTestProduct();
        const warehouse = await createTestWarehouse();

        // Warehouse has product1 but insufficient quantity of product2
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product1.id,
          quantity: 100,
        });
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product2.id,
          quantity: 5, // Less than requested 10
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        await expect(
          warehouseService.findClosestWarehouse(
            [
              { productId: product1.id, quantity: 10 },
              { productId: product2.id, quantity: 10 },
            ],
            customerCoordinates
          )
        ).rejects.toThrow(BusinessError);
      });

      it("should handle customer coordinates at warehouse location", async () => {
        const product = await createTestProduct();
        const warehouse = await createTestWarehouse({
          latitude: 40.7128,
          longitude: -74.006,
        });
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 100,
        });

        // Customer at exact warehouse location
        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        const result = await warehouseService.findClosestWarehouse(
          [{ productId: product.id, quantity: 10 }],
          customerCoordinates
        );

        expect(result.warehouse.id).toBe(warehouse.id);
      });

      it("should return warehouse selection result with metadata", async () => {
        const product = await createTestProduct();
        const warehouse = await createTestWarehouse();
        await createTestInventory({
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 100,
        });

        const customerCoordinates: Coordinates = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        const result = await warehouseService.findClosestWarehouse(
          [{ productId: product.id, quantity: 10 }],
          customerCoordinates
        );

        // Should have warehouse selection result structure
        expect(result).toHaveProperty("warehouse");
        expect(result).toHaveProperty("selectionReason");
        expect(result).toHaveProperty("distanceKm");
        expect(result.warehouse).toHaveProperty("id");
        expect(result.warehouse).toHaveProperty("name");
        expect(result.warehouse).toHaveProperty("address");
        expect(result.warehouse).toHaveProperty("latitude");
        expect(result.warehouse).toHaveProperty("longitude");
        expect(result.warehouse).not.toHaveProperty("distance");
        expect(result.warehouse).not.toHaveProperty("inventory");
      });
    });
  });
});
