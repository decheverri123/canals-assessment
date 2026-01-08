/**
 * Setup script for Phase 2 test data
 * Ensures test data exists for Phase 2 test scenarios:
 * - Distance Tie-Breaker: Warehouses in NY, SF, Denver with same items
 * - No Split Shipments: Items X and Y in different warehouses
 * - Partial Stock: Product with limited stock in closest warehouse
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function setupPhase2TestData() {
  console.log('Setting up test data for Phase 2 tests...\n');

  try {
    // Test 3: Distance Tie-Breaker
    // Create or find warehouses: NY, San Francisco, Denver
    console.log('Setting up warehouses for Distance Tie-Breaker test...');
    
    let warehouseNY = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { name: 'Warehouse NY' },
          { name: 'East Coast Warehouse' },
        ],
      },
    });

    let warehouseSF = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { name: 'Warehouse SF' },
          { name: 'West Coast Warehouse' },
        ],
      },
    });

    let warehouseDenver = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse Denver',
      },
    });

    // Update or create Warehouse NY
    if (warehouseNY) {
      warehouseNY = await prisma.warehouse.update({
        where: { id: warehouseNY.id },
        data: {
          name: 'Warehouse A (New York)',
          address: 'New York, NY',
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });
      console.log('Updated Warehouse A (New York)');
    } else {
      warehouseNY = await prisma.warehouse.create({
        data: {
          name: 'Warehouse A (New York)',
          address: 'New York, NY',
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });
      console.log('Created Warehouse A (New York)');
    }

    // Update or create Warehouse SF
    if (warehouseSF) {
      warehouseSF = await prisma.warehouse.update({
        where: { id: warehouseSF.id },
        data: {
          name: 'Warehouse B (San Francisco)',
          address: 'San Francisco, CA',
          latitude: 37.7749,
          longitude: -122.4194,
        },
      });
      console.log('Updated Warehouse B (San Francisco)');
    } else {
      warehouseSF = await prisma.warehouse.create({
        data: {
          name: 'Warehouse B (San Francisco)',
          address: 'San Francisco, CA',
          latitude: 37.7749,
          longitude: -122.4194,
        },
      });
      console.log('Created Warehouse B (San Francisco)');
    }

    // Create Warehouse Denver
    if (!warehouseDenver) {
      warehouseDenver = await prisma.warehouse.create({
        data: {
          name: 'Warehouse C (Denver)',
          address: 'Denver, CO',
          latitude: 39.7392,
          longitude: -104.9903,
        },
      });
      console.log('Created Warehouse C (Denver)');
    } else {
      warehouseDenver = await prisma.warehouse.update({
        where: { id: warehouseDenver.id },
        data: {
          name: 'Warehouse C (Denver)',
          address: 'Denver, CO',
          latitude: 39.7392,
          longitude: -104.9903,
        },
      });
      console.log('Updated Warehouse C (Denver)');
    }

    // Create test product for distance tie-breaker
    let testProduct = await prisma.product.findFirst({
      where: {
        sku: 'PROD-TIEBREAKER',
      },
    });

    if (!testProduct) {
      testProduct = await prisma.product.create({
        data: {
          sku: 'PROD-TIEBREAKER',
          name: 'Tie-Breaker Product',
          price: 4999, // $49.99 in cents
        },
      });
      console.log('Created Tie-Breaker Product');
    } else {
      console.log('Found Tie-Breaker Product');
    }

    // Ensure all three warehouses have the tie-breaker product
    for (const warehouse of [warehouseNY, warehouseSF, warehouseDenver]) {
      const inventory = await prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: testProduct.id,
          },
        },
      });

      if (!inventory) {
        await prisma.inventory.create({
          data: {
            warehouseId: warehouse.id,
            productId: testProduct.id,
            quantity: 20,
          },
        });
        console.log(`  Created inventory: ${warehouse.name} has 20 units of Tie-Breaker Product`);
      } else {
        await prisma.inventory.update({
          where: {
            warehouseId_productId: {
              warehouseId: warehouse.id,
              productId: testProduct.id,
            },
          },
          data: {
            quantity: 20,
          },
        });
        console.log(`  Updated inventory: ${warehouse.name} has 20 units of Tie-Breaker Product`);
      }
    }

    // Test 4: No Split Shipments
    console.log('\nSetting up products for No Split Shipments test...');
    
    let productX = await prisma.product.findFirst({
      where: {
        sku: 'PROD-X',
      },
    });

    let productY = await prisma.product.findFirst({
      where: {
        sku: 'PROD-Y',
      },
    });

    if (!productX) {
      productX = await prisma.product.create({
        data: {
          sku: 'PROD-X',
          name: 'Item X',
          price: 2999, // $29.99 in cents
        },
      });
      console.log('Created Item X');
    } else {
      console.log('Found Item X');
    }

    if (!productY) {
      productY = await prisma.product.create({
        data: {
          sku: 'PROD-Y',
          name: 'Item Y',
          price: 3999, // $39.99 in cents
        },
      });
      console.log('Created Item Y');
    } else {
      console.log('Found Item Y');
    }

    // Item X only in Warehouse NY
    const inventoryX = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseNY.id,
          productId: productX.id,
        },
      },
    });

    if (!inventoryX) {
      await prisma.inventory.create({
        data: {
          warehouseId: warehouseNY.id,
          productId: productX.id,
          quantity: 15,
        },
      });
      console.log('  Created inventory: Warehouse A has Item X');
    } else {
      await prisma.inventory.update({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: productX.id,
          },
        },
        data: {
          quantity: 15,
        },
      });
      console.log('  Updated inventory: Warehouse A has Item X');
    }

    // Ensure Item X is NOT in Warehouse SF
    const inventoryXSF = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseSF.id,
          productId: productX.id,
        },
      },
    });

    if (inventoryXSF) {
      await prisma.inventory.delete({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseSF.id,
            productId: productX.id,
          },
        },
      });
      console.log('  Removed Item X from Warehouse B');
    }

    // Item Y only in Warehouse SF
    const inventoryY = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseSF.id,
          productId: productY.id,
        },
      },
    });

    if (!inventoryY) {
      await prisma.inventory.create({
        data: {
          warehouseId: warehouseSF.id,
          productId: productY.id,
          quantity: 15,
        },
      });
      console.log('  Created inventory: Warehouse B has Item Y');
    } else {
      await prisma.inventory.update({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseSF.id,
            productId: productY.id,
          },
        },
        data: {
          quantity: 15,
        },
      });
      console.log('  Updated inventory: Warehouse B has Item Y');
    }

    // Ensure Item Y is NOT in Warehouse NY
    const inventoryYNY = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseNY.id,
          productId: productY.id,
        },
      },
    });

    if (inventoryYNY) {
      await prisma.inventory.delete({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: productY.id,
          },
        },
      });
      console.log('  Removed Item Y from Warehouse A');
    }

    // Test 5: Partial Stock Rejection
    console.log('\nSetting up products for Partial Stock test...');
    
    // Use Product A from Phase 1, or create a new one
    let productPartial = await prisma.product.findFirst({
      where: {
        sku: 'PROD-A',
      },
    });

    if (!productPartial) {
      productPartial = await prisma.product.create({
        data: {
          sku: 'PROD-A',
          name: 'Product A',
          price: 9999, // $99.99 in cents
        },
      });
      console.log('Created Product A for Partial Stock test');
    } else {
      console.log('Found Product A for Partial Stock test');
    }

    // Closest warehouse (Denver) has only 4 units
    const inventoryDenver = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseDenver.id,
          productId: productPartial.id,
        },
      },
    });

    if (!inventoryDenver) {
      await prisma.inventory.create({
        data: {
          warehouseId: warehouseDenver.id,
          productId: productPartial.id,
          quantity: 4,
        },
      });
      console.log('  Created inventory: Warehouse C (Denver) has 4 units of Product A');
    } else {
      await prisma.inventory.update({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseDenver.id,
            productId: productPartial.id,
          },
        },
        data: {
          quantity: 4,
        },
      });
      console.log('  Updated inventory: Warehouse C (Denver) has 4 units of Product A');
    }

    // Further warehouse (NY) has 10 units
    const inventoryNY = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseNY.id,
          productId: productPartial.id,
        },
      },
    });

    if (!inventoryNY) {
      await prisma.inventory.create({
        data: {
          warehouseId: warehouseNY.id,
          productId: productPartial.id,
          quantity: 10,
        },
      });
      console.log('  Created inventory: Warehouse A (NY) has 10 units of Product A');
    } else {
      await prisma.inventory.update({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: productPartial.id,
          },
        },
        data: {
          quantity: 10,
        },
      });
      console.log('  Updated inventory: Warehouse A (NY) has 10 units of Product A');
    }

    console.log('\n✓ Phase 2 test data setup completed successfully!');
    console.log('\nTest Data Summary:');
    console.log(`  Warehouse A (NY): ${warehouseNY.id}`);
    console.log(`  Warehouse B (SF): ${warehouseSF.id}`);
    console.log(`  Warehouse C (Denver): ${warehouseDenver.id}`);
    console.log(`  Tie-Breaker Product: ${testProduct.id} (available in all 3 warehouses)`);
    console.log(`  Item X: ${productX.id} (only in Warehouse A)`);
    console.log(`  Item Y: ${productY.id} (only in Warehouse B)`);
    console.log(`  Product A: ${productPartial.id} (4 units in Denver, 10 units in NY)`);
  } catch (error) {
    console.error('Error setting up Phase 2 test data:', error);
    throw error;
  }
}

async function main() {
  try {
    await setupPhase2TestData();
  } catch (error) {
    console.error('Failed to setup Phase 2 test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
