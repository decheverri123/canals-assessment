/**
 * Setup script for test data
 * Ensures test data exists for Phase 1 test scenarios:
 * - Product A with 10 units in Warehouse NY
 * - Starter Kit products (Keyboard, Mouse, Monitor) in a warehouse
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function setupTestData() {
  console.log('Setting up test data for Phase 1 tests...\n');

  try {
    // Find or create Warehouse NY (East Coast Warehouse in New York)
    let warehouseNY = await prisma.warehouse.findFirst({
      where: {
        name: 'East Coast Warehouse',
      },
    });

    if (!warehouseNY) {
      warehouseNY = await prisma.warehouse.create({
        data: {
          name: 'Warehouse NY',
          address: 'New York, NY',
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });
      console.log('Created Warehouse NY');
    } else {
      // Update name to "Warehouse NY" if it's East Coast Warehouse
      warehouseNY = await prisma.warehouse.update({
        where: { id: warehouseNY.id },
        data: { name: 'Warehouse NY' },
      });
      console.log('Found Warehouse NY (updated from East Coast Warehouse)');
    }

    // Find or create Product A
    let productA = await prisma.product.findFirst({
      where: {
        sku: 'PROD-A',
      },
    });

    if (!productA) {
      productA = await prisma.product.create({
        data: {
          sku: 'PROD-A',
          name: 'Product A',
          price: 9999, // $99.99 in cents
        },
      });
      console.log('Created Product A');
    } else {
      console.log('Found Product A');
    }

    // Ensure Warehouse NY has exactly 10 units of Product A
    const inventory = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseNY.id,
          productId: productA.id,
        },
      },
    });

    if (!inventory) {
      await prisma.inventory.create({
        data: {
          warehouseId: warehouseNY.id,
          productId: productA.id,
          quantity: 10,
        },
      });
      console.log('Created inventory: Warehouse NY has 10 units of Product A');
    } else {
      await prisma.inventory.update({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: productA.id,
          },
        },
        data: {
          quantity: 10,
        },
      });
      console.log('Updated inventory: Warehouse NY has 10 units of Product A');
    }

    // Setup for Multi-Item Bundle test
    // Find or create products for Starter Kit: Keyboard, Mouse, Monitor
    let keyboard = await prisma.product.findFirst({
      where: {
        sku: 'PROD-KEYBOARD',
      },
    });

    let mouse = await prisma.product.findFirst({
      where: {
        sku: 'PROD-MOUSE',
      },
    });

    let monitor = await prisma.product.findFirst({
      where: {
        sku: 'PROD-MONITOR',
      },
    });

    if (!keyboard) {
      keyboard = await prisma.product.create({
        data: {
          sku: 'PROD-KEYBOARD',
          name: 'Keyboard',
          price: 8999, // $89.99 in cents
        },
      });
      console.log('Created Keyboard');
    } else {
      console.log('Found Keyboard');
    }

    if (!mouse) {
      mouse = await prisma.product.create({
        data: {
          sku: 'PROD-MOUSE',
          name: 'Mouse',
          price: 2999, // $29.99 in cents
        },
      });
      console.log('Created Mouse');
    } else {
      console.log('Found Mouse');
    }

    if (!monitor) {
      monitor = await prisma.product.create({
        data: {
          sku: 'PROD-MONITOR',
          name: 'Monitor',
          price: 19999, // $199.99 in cents
        },
      });
      console.log('Created Monitor');
    } else {
      console.log('Found Monitor');
    }

    // Ensure Warehouse NY has all three Starter Kit items
    const starterKitProducts = [
      { product: keyboard, quantity: 20 },
      { product: mouse, quantity: 30 },
      { product: monitor, quantity: 15 },
    ];

    for (const { product, quantity } of starterKitProducts) {
      const existingInventory = await prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: product.id,
          },
        },
      });

      if (!existingInventory) {
        await prisma.inventory.create({
          data: {
            warehouseId: warehouseNY.id,
            productId: product.id,
            quantity,
          },
        });
        console.log(`Created inventory: Warehouse NY has ${quantity} units of ${product.name}`);
      } else {
        await prisma.inventory.update({
          where: {
            warehouseId_productId: {
              warehouseId: warehouseNY.id,
              productId: product.id,
            },
          },
          data: {
            quantity,
          },
        });
        console.log(`Updated inventory: Warehouse NY has ${quantity} units of ${product.name}`);
      }
    }

    console.log('\n✓ Test data setup completed successfully!');
    console.log('\nTest Data Summary:');
    console.log(`  Warehouse NY ID: ${warehouseNY.id}`);
    console.log(`  Product A ID: ${productA.id} (10 units in Warehouse NY)`);
    console.log(`  Keyboard ID: ${keyboard.id}`);
    console.log(`  Mouse ID: ${mouse.id}`);
    console.log(`  Monitor ID: ${monitor.id}`);
    console.log(`  Starter Kit items available in Warehouse NY`);
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
}

async function main() {
  try {
    await setupTestData();
  } catch (error) {
    console.error('Failed to setup test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
