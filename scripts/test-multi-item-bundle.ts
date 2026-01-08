/**
 * Test Script: Multi-Item Bundle
 * 
 * Scenario: A customer orders a "Starter Kit" (1 Keyboard, 1 Mouse, 1 Monitor).
 * 
 * Setup: Warehouse A has all three items in stock.
 * Action: Submit one order with 3 different line items.
 * 
 * Expected Result:
 * - Success
 * - All three items are deducted from the same warehouse
 */

import { PrismaClient, OrderStatus } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface OrderRequest {
  customer: {
    email: string;
  };
  address: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

interface OrderResponse {
  id: string;
  customerEmail: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  orderItems: Array<{
    id: string;
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
}

/**
 * Format currency from cents to dollars
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Make POST request to /orders endpoint
 */
async function createOrder(
  apiUrl: string,
  orderData: OrderRequest
): Promise<OrderResponse> {
  const response = await fetch(`${apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  const data = (await response.json()) as OrderResponse;

  if (!response.ok) {
    throw new Error(
      `Request failed with status ${response.status}: ${JSON.stringify(data, null, 2)}`
    );
  }

  return data;
}

/**
 * Main test function
 */
async function testMultiItemBundle() {
  console.log('='.repeat(70));
  console.log('TEST: Multi-Item Bundle');
  console.log('='.repeat(70));
  console.log('\nScenario: A customer orders a "Starter Kit" (1 Keyboard, 1 Mouse, 1 Monitor).\n');

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Find Starter Kit products
    console.log('Step 1: Verifying test data setup...');
    const keyboard = await prisma.product.findFirst({
      where: {
        sku: 'PROD-KEYBOARD',
      },
    });

    const mouse = await prisma.product.findFirst({
      where: {
        sku: 'PROD-MOUSE',
      },
    });

    const monitor = await prisma.product.findFirst({
      where: {
        sku: 'PROD-MONITOR',
      },
    });

    if (!keyboard || !mouse || !monitor) {
      throw new Error('Starter Kit products not found. Please run: pnpm ts-node scripts/setup-test-data.ts');
    }

    console.log(`  Found Keyboard: ${keyboard.name} (${keyboard.sku})`);
    console.log(`  Found Mouse: ${mouse.name} (${mouse.sku})`);
    console.log(`  Found Monitor: ${monitor.name} (${monitor.sku})`);

    // Step 2: Find a warehouse that has all three items
    console.log('\nStep 2: Finding warehouse with all Starter Kit items...');
    
    // Find Warehouse NY (should have all items from setup)
    const warehouseNY = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { name: 'Warehouse NY' },
          { name: 'East Coast Warehouse' },
        ],
      },
    });

    if (!warehouseNY) {
      throw new Error('Warehouse NY not found. Please run: pnpm ts-node scripts/setup-test-data.ts');
    }

    // Check inventory for all three items
    const [keyboardInventory, mouseInventory, monitorInventory] = await Promise.all([
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: keyboard.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: mouse.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: monitor.id,
          },
        },
      }),
    ]);

    if (!keyboardInventory || !mouseInventory || !monitorInventory) {
      throw new Error('Not all Starter Kit items available in Warehouse NY. Please run: pnpm ts-node scripts/setup-test-data.ts');
    }

    const initialQuantities = {
      keyboard: keyboardInventory.quantity,
      mouse: mouseInventory.quantity,
      monitor: monitorInventory.quantity,
    };

    console.log(`  Warehouse: ${warehouseNY.name} (${warehouseNY.id})`);
    console.log(`  Keyboard inventory: ${initialQuantities.keyboard} units`);
    console.log(`  Mouse inventory: ${initialQuantities.mouse} units`);
    console.log(`  Monitor inventory: ${initialQuantities.monitor} units`);

    // Step 3: Create order with all three items
    console.log('\nStep 3: Creating order with Starter Kit...');
    const orderData: OrderRequest = {
      customer: {
        email: 'customer@example.com',
      },
      address: '456 Broadway, New York, NY 10013',
      items: [
        {
          productId: keyboard.id,
          quantity: 1,
        },
        {
          productId: mouse.id,
          quantity: 1,
        },
        {
          productId: monitor.id,
          quantity: 1,
        },
      ],
    };

    console.log(`  Customer: ${orderData.customer.email}`);
    console.log(`  Address: ${orderData.address}`);
    console.log(`  Items:`);
    console.log(`    1x ${keyboard.name}`);
    console.log(`    1x ${mouse.name}`);
    console.log(`    1x ${monitor.name}`);
    console.log(`  Sending POST request to ${apiUrl}/orders...\n`);

    const orderResponse = await createOrder(apiUrl, orderData);

    // Step 4: Verify response
    console.log('Step 4: Verifying response...');
    console.log(`  Status Code: 201 Created ${orderResponse.id ? '✓' : '✗'}`);
    console.log(`  Order ID: ${orderResponse.id} ${orderResponse.id ? '✓' : '✗'}`);
    console.log(`  Order Status: ${orderResponse.status} ${orderResponse.status === 'PAID' ? '✓' : '✗'}`);
    console.log(`  Total Amount: ${formatCurrency(orderResponse.totalAmount)}`);
    console.log(`  Number of items: ${orderResponse.orderItems.length} ${orderResponse.orderItems.length === 3 ? '✓' : '✗'}`);

    // Step 5: Verify database state - all items deducted from same warehouse
    console.log('\nStep 5: Verifying database state...');
    
    // Check order status in database
    const orderInDb = await prisma.order.findUnique({
      where: {
        id: orderResponse.id,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!orderInDb) {
      throw new Error('Order not found in database');
    }

    console.log(`  Order status in DB: ${orderInDb.status} ${orderInDb.status === OrderStatus.PAID ? '✓' : '✗'}`);
    console.log(`  Order items in DB: ${orderInDb.orderItems.length} ${orderInDb.orderItems.length === 3 ? '✓' : '✗'}`);

    // Check inventory after order - all should be deducted from Warehouse NY
    const [updatedKeyboardInventory, updatedMouseInventory, updatedMonitorInventory] = await Promise.all([
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: keyboard.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: mouse.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: monitor.id,
          },
        },
      }),
    ]);

    if (!updatedKeyboardInventory || !updatedMouseInventory || !updatedMonitorInventory) {
      throw new Error('Inventory not found after order');
    }

    const finalQuantities = {
      keyboard: updatedKeyboardInventory.quantity,
      mouse: updatedMouseInventory.quantity,
      monitor: updatedMonitorInventory.quantity,
    };

    console.log('\n  Inventory Changes:');
    console.log(`    Keyboard: ${initialQuantities.keyboard} → ${finalQuantities.keyboard} (expected: ${initialQuantities.keyboard - 1}) ${finalQuantities.keyboard === initialQuantities.keyboard - 1 ? '✓' : '✗'}`);
    console.log(`    Mouse: ${initialQuantities.mouse} → ${finalQuantities.mouse} (expected: ${initialQuantities.mouse - 1}) ${finalQuantities.mouse === initialQuantities.mouse - 1 ? '✓' : '✗'}`);
    console.log(`    Monitor: ${initialQuantities.monitor} → ${finalQuantities.monitor} (expected: ${initialQuantities.monitor - 1}) ${finalQuantities.monitor === initialQuantities.monitor - 1 ? '✓' : '✗'}`);

    // Verify all items were deducted from the same warehouse
    const allFromSameWarehouse = 
      updatedKeyboardInventory.warehouseId === warehouseNY.id &&
      updatedMouseInventory.warehouseId === warehouseNY.id &&
      updatedMonitorInventory.warehouseId === warehouseNY.id;

    console.log(`\n  All items deducted from same warehouse (${warehouseNY.name}): ${allFromSameWarehouse ? '✓' : '✗'}`);

    // Step 6: Test results summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));
    
    const results = {
      'Order created successfully': !!orderResponse.id,
      'Order status is PAID': orderInDb.status === OrderStatus.PAID,
      'All 3 items in order': orderResponse.orderItems.length === 3,
      'Keyboard inventory decreased': finalQuantities.keyboard === initialQuantities.keyboard - 1,
      'Mouse inventory decreased': finalQuantities.mouse === initialQuantities.mouse - 1,
      'Monitor inventory decreased': finalQuantities.monitor === initialQuantities.monitor - 1,
      'All items deducted from same warehouse': allFromSameWarehouse,
    };

    let allPassed = true;
    for (const [test, passed] of Object.entries(results)) {
      const status = passed ? '✓ PASS' : '✗ FAIL';
      console.log(`  ${status}: ${test}`);
      if (!passed) allPassed = false;
    }

    console.log('\n' + '='.repeat(70));
    if (allPassed) {
      console.log('✓ ALL TESTS PASSED');
    } else {
      console.log('✗ SOME TESTS FAILED');
    }
    console.log('='.repeat(70) + '\n');

    return allPassed;
  } catch (error) {
    console.error('\n✗ TEST FAILED:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.message.includes('fetch')) {
      console.error('\nMake sure the server is running:');
      console.error('  pnpm dev');
    }
    throw error;
  }
}

async function main() {
  try {
    await testMultiItemBundle();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
