import { PrismaClient, Warehouse } from '@prisma/client';
import { calculateHaversineDistance } from '../utils/haversine';
import { BusinessError } from '../middlewares/error-handler.middleware';
import { Coordinates } from '../types/coordinates.types';

export interface OrderItemRequest {
  productId: string;
  quantity: number;
}

export interface WarehouseWithDistance extends Warehouse {
  distance: number;
  inventory: Array<{
    id: string;
    warehouseId: string;
    productId: string;
    quantity: number;
    product: {
      id: string;
      sku: string;
      name: string;
      price: number;
    };
  }>;
}

export interface WarehouseSelectionResult {
  warehouse: Warehouse;
  selectionReason: string;
  distanceKm: number;
  closestWarehouseExcluded?: {
    name: string;
    distanceKm: number;
    reason: string;
  };
}

/**
 * Service for warehouse selection and inventory management
 */
export class WarehouseService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find the closest warehouse that has sufficient inventory for all order items
   * @param orderItems Array of order items with productId and quantity
   * @param customerCoordinates Customer's coordinates
   * @returns The selected warehouse with selection metadata
   * @throws Error if no single warehouse has all items in sufficient quantity
   */
  async findClosestWarehouse(
    orderItems: OrderItemRequest[],
    customerCoordinates: Coordinates
  ): Promise<WarehouseSelectionResult> {
    // Get all warehouses
    const warehouses = await this.prisma.warehouse.findMany({
      include: {
        inventory: {
          include: {
            product: true,
          },
        },
      },
    });

    // Calculate distance to ALL warehouses (for comparison)
    const allWarehousesWithDistance: WarehouseWithDistance[] = warehouses.map(
      (warehouse) => {
        const distance = calculateHaversineDistance(
          customerCoordinates,
          {
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
          }
        );

        return {
          ...warehouse,
          distance,
        };
      }
    );

    // Sort all warehouses by distance to find the closest overall
    allWarehousesWithDistance.sort((a, b) => a.distance - b.distance);
    const closestWarehouseOverall = allWarehousesWithDistance[0];

    // Filter warehouses that have sufficient inventory for all order items
    const warehousesWithInventory = allWarehousesWithDistance.filter(
      (warehouse) => {
        return orderItems.every((orderItem) => {
          const inventory = warehouse.inventory.find(
            (inv) => inv.productId === orderItem.productId
          );
          return inventory && inventory.quantity >= orderItem.quantity;
        });
      }
    );

    if (warehousesWithInventory.length === 0) {
      throw new BusinessError(
        'No single warehouse has all items in sufficient quantity. Split shipments are not supported.',
        400,
        'SPLIT_SHIPMENT_NOT_SUPPORTED'
      );
    }

    // The closest warehouse with all items
    const selectedWarehouse = warehousesWithInventory[0];
    const distanceKm = Math.round(selectedWarehouse.distance * 10) / 10;

    // Determine selection reason
    let selectionReason: string;
    let closestExcluded: {
      name: string;
      distanceKm: number;
      reason: string;
    } | undefined;

    if (selectedWarehouse.id === closestWarehouseOverall.id) {
      selectionReason = `Selected as the closest warehouse (${distanceKm} km away) with all requested items in stock.`;
    } else {
      const closestDistanceKm =
        Math.round(closestWarehouseOverall.distance * 10) / 10;

      // Find why the closest warehouse was excluded
      const missingItems: string[] = [];
      orderItems.forEach((orderItem) => {
        const inventory = closestWarehouseOverall.inventory.find(
          (inv) => inv.productId === orderItem.productId
        );
        if (!inventory) {
          missingItems.push(`Product ${orderItem.productId}`);
        } else if (inventory.quantity < orderItem.quantity) {
          missingItems.push(
            `Product ${orderItem.productId} (only ${inventory.quantity} available, need ${orderItem.quantity})`
          );
        }
      });

      const reason =
        missingItems.length > 0
          ? `Missing or insufficient inventory: ${missingItems.join(', ')}`
          : 'Insufficient inventory for all items';

      closestExcluded = {
        name: closestWarehouseOverall.name,
        distanceKm: closestDistanceKm,
        reason,
      };

      selectionReason = `Selected warehouse is ${distanceKm} km away. Closest warehouse "${closestWarehouseOverall.name}" (${closestDistanceKm} km) was excluded: ${reason}.`;
    }

    return {
      warehouse: {
        id: selectedWarehouse.id,
        name: selectedWarehouse.name,
        address: selectedWarehouse.address,
        latitude: selectedWarehouse.latitude,
        longitude: selectedWarehouse.longitude,
      },
      selectionReason,
      distanceKm,
      closestWarehouseExcluded: closestExcluded,
    };
  }
}
