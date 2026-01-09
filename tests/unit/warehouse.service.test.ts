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
    });
  });
});
