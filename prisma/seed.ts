/**
 * Prisma seed script
 * Creates initial data: 3 warehouses, 5 products, and varied inventory levels
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Check if data already exists
  const existingProducts = await prisma.product.count();
  const existingWarehouses = await prisma.warehouse.count();
  
  if (existingProducts > 0 || existingWarehouses > 0) {
    console.log(`Found existing data: ${existingProducts} products, ${existingWarehouses} warehouses`);
    console.log('Clearing existing data for fresh seed...');
  } else {
    console.log('No existing data found. Creating fresh seed...');
  }

  // Clear existing data (for idempotency)
  await prisma.inventory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create 3 warehouses
  console.log('Creating warehouses...');
  const eastCoastWarehouse = await prisma.warehouse.create({
    data: {
      name: 'East Coast Warehouse',
      address: 'New York, NY',
      latitude: 40.7128,
      longitude: -74.0060,
    },
  });

  const westCoastWarehouse = await prisma.warehouse.create({
    data: {
      name: 'West Coast Warehouse',
      address: 'Los Angeles, CA',
      latitude: 34.0522,
      longitude: -118.2437,
    },
  });

  const centralWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Central Warehouse',
      address: 'Chicago, IL',
      latitude: 41.8781,
      longitude: -87.6298,
    },
  });

  console.log('Created warehouses:', {
    eastCoast: eastCoastWarehouse.id,
    westCoast: westCoastWarehouse.id,
    central: centralWarehouse.id,
  });

  // Create 5 products with varied prices
  console.log('Creating products...');
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'PROD-001',
        name: 'Laptop Computer',
        price: 129999, // $1,299.99 in cents
      },
    }),
    prisma.product.create({
      data: {
        sku: 'PROD-002',
        name: 'Wireless Mouse',
        price: 2999, // $29.99 in cents
      },
    }),
    prisma.product.create({
      data: {
        sku: 'PROD-003',
        name: 'Mechanical Keyboard',
        price: 8999, // $89.99 in cents
      },
    }),
    prisma.product.create({
      data: {
        sku: 'PROD-004',
        name: 'USB-C Cable',
        price: 1999, // $19.99 in cents
      },
    }),
    prisma.product.create({
      data: {
        sku: 'PROD-005',
        name: 'Monitor Stand',
        price: 4999, // $49.99 in cents
      },
    }),
  ]);

  console.log('Created products:', products.map((p) => ({ sku: p.sku, name: p.name })));

  // Create inventory entries
  // Strategy:
  // - East Coast has all products (ensures at least one warehouse has everything)
  // - West Coast has most products but missing one
  // - Central has some products only
  // - Vary quantities to test warehouse selection logic

  console.log('Creating inventory entries...');

  // East Coast Warehouse: Has all products with good quantities
  await Promise.all([
    prisma.inventory.create({
      data: {
        warehouseId: eastCoastWarehouse.id,
        productId: products[0].id, // Laptop
        quantity: 50,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: eastCoastWarehouse.id,
        productId: products[1].id, // Mouse
        quantity: 200,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: eastCoastWarehouse.id,
        productId: products[2].id, // Keyboard
        quantity: 100,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: eastCoastWarehouse.id,
        productId: products[3].id, // USB-C Cable
        quantity: 500,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: eastCoastWarehouse.id,
        productId: products[4].id, // Monitor Stand
        quantity: 75,
      },
    }),
  ]);

  // West Coast Warehouse: Has most products (missing Monitor Stand)
  await Promise.all([
    prisma.inventory.create({
      data: {
        warehouseId: westCoastWarehouse.id,
        productId: products[0].id, // Laptop
        quantity: 30,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: westCoastWarehouse.id,
        productId: products[1].id, // Mouse
        quantity: 150,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: westCoastWarehouse.id,
        productId: products[2].id, // Keyboard
        quantity: 80,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: westCoastWarehouse.id,
        productId: products[3].id, // USB-C Cable
        quantity: 300,
      },
    }),
    // Note: Monitor Stand (products[4]) is NOT in West Coast
  ]);

  // Central Warehouse: Has some products only (Laptop, Mouse, USB-C Cable)
  await Promise.all([
    prisma.inventory.create({
      data: {
        warehouseId: centralWarehouse.id,
        productId: products[0].id, // Laptop
        quantity: 20,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: centralWarehouse.id,
        productId: products[1].id, // Mouse
        quantity: 100,
      },
    }),
    prisma.inventory.create({
      data: {
        warehouseId: centralWarehouse.id,
        productId: products[3].id, // USB-C Cable
        quantity: 250,
      },
    }),
    // Note: Keyboard and Monitor Stand are NOT in Central
  ]);

  console.log('Inventory created successfully');
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    console.error('Stack trace:', e instanceof Error ? e.stack : 'No stack trace available');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
