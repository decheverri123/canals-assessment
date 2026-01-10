import { PrismaClient, Warehouse } from "@prisma/client";
import { calculateHaversineDistance } from "../utils/haversine";
import { BusinessError } from "../middlewares/error-handler.middleware";
import { Coordinates } from "../types/coordinates.types";

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
 * Transaction client type for Prisma interactive transactions
 */
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

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

    // Calculate distance and sort
    const sortedWarehouses = this.calculateDistancesAndSort(
      warehouses,
      customerCoordinates
    );
    const closestWarehouseOverall = sortedWarehouses[0];

    // Filter warehouses that have sufficient inventory for all order items
    const warehousesWithInventory = this.filterByInventory(
      sortedWarehouses,
      orderItems
    );

    if (warehousesWithInventory.length === 0) {
      throw new BusinessError(
        "No single warehouse has all items in sufficient quantity. Split shipments are not supported.",
        400,
        "SPLIT_SHIPMENT_NOT_SUPPORTED"
      );
    }

    // The closest warehouse with all items
    const selectedWarehouse = warehousesWithInventory[0];
    const distanceKm = Math.round(selectedWarehouse.distance * 10) / 10;

    return this.constructSelectionResult(
      selectedWarehouse,
      closestWarehouseOverall,
      orderItems,
      distanceKm
    );
  }

  private calculateDistancesAndSort(
    warehouses: Array<Warehouse & { inventory: any[] }>,
    customerCoordinates: Coordinates
  ): WarehouseWithDistance[] {
    const warehousesWithDistance = warehouses.map((warehouse) => ({
      ...warehouse,
      distance: calculateHaversineDistance(customerCoordinates, {
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
      }),
    }));

    return warehousesWithDistance.sort((a, b) => a.distance - b.distance);
  }

  private filterByInventory(
    warehouses: WarehouseWithDistance[],
    orderItems: OrderItemRequest[]
  ): WarehouseWithDistance[] {
    return warehouses.filter((warehouse) => {
      return orderItems.every((orderItem) => {
        const inventory = warehouse.inventory.find(
          (inv) => inv.productId === orderItem.productId
        );
        return inventory && inventory.quantity >= orderItem.quantity;
      });
    });
  }

  private constructSelectionResult(
    selectedWarehouse: WarehouseWithDistance,
    closestWarehouseOverall: WarehouseWithDistance,
    orderItems: OrderItemRequest[],
    distanceKm: number
  ): WarehouseSelectionResult {
    let selectionReason: string;
    let closestExcluded:
      | { name: string; distanceKm: number; reason: string }
      | undefined;

    if (selectedWarehouse.id === closestWarehouseOverall.id) {
      selectionReason = `Selected as the closest warehouse (${distanceKm} km away) with all requested items in stock.`;
    } else {
      const closestDistanceKm =
        Math.round(closestWarehouseOverall.distance * 10) / 10;
      const reason = this.getExclusionReason(
        closestWarehouseOverall,
        orderItems
      );

      closestExcluded = {
        name: closestWarehouseOverall.name,
        distanceKm: closestDistanceKm,
        reason,
      };

      selectionReason = `Selected warehouse is ${distanceKm} km away. Closest warehouse ${closestWarehouseOverall.name} (${closestDistanceKm} km) was excluded: ${reason}.`;
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

  private getExclusionReason(
    warehouse: WarehouseWithDistance,
    orderItems: OrderItemRequest[]
  ): string {
    const missingItems: string[] = [];
    orderItems.forEach((orderItem) => {
      const inventory = warehouse.inventory.find(
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

    return missingItems.length > 0
      ? `Missing or insufficient inventory: ${missingItems.join(", ")}`
      : "Insufficient inventory for all items";
  }

  /**
   * Find the closest warehouse with row-level locking within a transaction.
   * Uses SELECT ... FOR UPDATE to prevent concurrent modifications.
   * @param tx Transaction client from Prisma interactive transaction
   * @param orderItems Array of order items with productId and quantity
   * @param customerCoordinates Customer's coordinates
   * @returns The selected warehouse with selection metadata
   * @throws Error if no single warehouse has all items in sufficient quantity
   */
  async findClosestWarehouseWithLock(
    tx: TransactionClient,
    orderItems: OrderItemRequest[],
    customerCoordinates: Coordinates
  ): Promise<WarehouseSelectionResult> {
    const productIds = orderItems.map((item) => item.productId);

    // Get all warehouses first (no lock needed on warehouses table)
    const warehouses = await tx.warehouse.findMany();

    if (warehouses.length === 0) {
      throw new BusinessError(
        "No warehouses available",
        500,
        "NO_WAREHOUSES"
      );
    }

    // Lock and fetch inventory rows for the requested products using raw SQL
    // FOR UPDATE ensures no other transaction can modify these rows until we commit
    const lockedInventory = await tx.$queryRaw<
      Array<{
        id: string;
        warehouse_id: string;
        product_id: string;
        quantity: number;
      }>
    >`
      SELECT id, warehouse_id, product_id, quantity
      FROM inventory
      WHERE product_id = ANY(${productIds})
      FOR UPDATE
    `;

    // Map inventory back to warehouse structure
    const warehouseInventoryMap = new Map<
      string,
      Array<{ productId: string; quantity: number }>
    >();

    for (const inv of lockedInventory) {
      const warehouseId = inv.warehouse_id;
      if (!warehouseInventoryMap.has(warehouseId)) {
        warehouseInventoryMap.set(warehouseId, []);
      }
      warehouseInventoryMap.get(warehouseId)!.push({
        productId: inv.product_id,
        quantity: inv.quantity,
      });
    }

    // Calculate distances and build warehouse list with inventory
    const warehousesWithDistanceAndInventory: Array<{
      warehouse: Warehouse;
      distance: number;
      inventory: Array<{ productId: string; quantity: number }>;
    }> = warehouses.map((warehouse) => ({
      warehouse,
      distance: calculateHaversineDistance(customerCoordinates, {
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
      }),
      inventory: warehouseInventoryMap.get(warehouse.id) || [],
    }));

    // Sort by distance
    warehousesWithDistanceAndInventory.sort((a, b) => a.distance - b.distance);

    const closestWarehouseOverall = warehousesWithDistanceAndInventory[0];

    // Filter warehouses that have sufficient inventory for all order items
    const warehousesWithSufficientInventory =
      warehousesWithDistanceAndInventory.filter((wh) => {
        return orderItems.every((orderItem) => {
          const inv = wh.inventory.find(
            (i) => i.productId === orderItem.productId
          );
          return inv && inv.quantity >= orderItem.quantity;
        });
      });

    if (warehousesWithSufficientInventory.length === 0) {
      throw new BusinessError(
        "No single warehouse has all items in sufficient quantity. Split shipments are not supported.",
        400,
        "SPLIT_SHIPMENT_NOT_SUPPORTED"
      );
    }

    const selected = warehousesWithSufficientInventory[0];
    const distanceKm = Math.round(selected.distance * 10) / 10;

    // Build selection result with explanation
    let selectionReason: string;
    let closestExcluded:
      | { name: string; distanceKm: number; reason: string }
      | undefined;

    if (selected.warehouse.id === closestWarehouseOverall.warehouse.id) {
      selectionReason = `Selected as the closest warehouse (${distanceKm} km away) with all requested items in stock.`;
    } else {
      const closestDistanceKm =
        Math.round(closestWarehouseOverall.distance * 10) / 10;
      const missingItems: string[] = [];

      orderItems.forEach((orderItem) => {
        const inv = closestWarehouseOverall.inventory.find(
          (i) => i.productId === orderItem.productId
        );
        if (!inv) {
          missingItems.push(`Product ${orderItem.productId}`);
        } else if (inv.quantity < orderItem.quantity) {
          missingItems.push(
            `Product ${orderItem.productId} (only ${inv.quantity} available, need ${orderItem.quantity})`
          );
        }
      });

      const reason =
        missingItems.length > 0
          ? `Missing or insufficient inventory: ${missingItems.join(", ")}`
          : "Insufficient inventory for all items";

      closestExcluded = {
        name: closestWarehouseOverall.warehouse.name,
        distanceKm: closestDistanceKm,
        reason,
      };

      selectionReason = `Selected warehouse is ${distanceKm} km away. Closest warehouse ${closestWarehouseOverall.warehouse.name} (${closestDistanceKm} km) was excluded: ${reason}.`;
    }

    return {
      warehouse: selected.warehouse,
      selectionReason,
      distanceKm,
      closestWarehouseExcluded: closestExcluded,
    };
  }
}
