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
   * @returns The closest warehouse with all items in stock
   * @throws Error if no single warehouse has all items in sufficient quantity
   */
  async findClosestWarehouse(
    orderItems: OrderItemRequest[],
    customerCoordinates: Coordinates
  ): Promise<Warehouse> {
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

    // Filter warehouses that have sufficient inventory for all order items
    const warehousesWithInventory = warehouses.filter((warehouse) => {
      return orderItems.every((orderItem) => {
        const inventory = warehouse.inventory.find(
          (inv) => inv.productId === orderItem.productId
        );
        return inventory && inventory.quantity >= orderItem.quantity;
      });
    });

    if (warehousesWithInventory.length === 0) {
      throw new BusinessError(
        'No single warehouse has all items in sufficient quantity. Split shipments are not supported.',
        400,
        'SPLIT_SHIPMENT_NOT_SUPPORTED'
      );
    }

    // Calculate distance from customer to each warehouse
    const warehousesWithDistance: WarehouseWithDistance[] = warehousesWithInventory.map(
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

    // Sort by distance and return the closest
    warehousesWithDistance.sort((a, b) => a.distance - b.distance);

    const closestWarehouse = warehousesWithDistance[0];

    // Return only the Warehouse type (without distance and inventory)
    return {
      id: closestWarehouse.id,
      name: closestWarehouse.name,
      address: closestWarehouse.address,
      latitude: closestWarehouse.latitude,
      longitude: closestWarehouse.longitude,
    };
  }
}
