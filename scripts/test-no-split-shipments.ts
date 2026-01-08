/**
 * Test Script: The "No Split Shipments" Rule
 * 
 * Scenario: Customer wants Item X and Item Y.
 * 
 * Setup:
 * - Warehouse A has Item X (but no Y).
 * - Warehouse B has Item Y (but no X).
 * 
 * Action: Submit order containing both items.
 * 
 * Expected Result: FAILURE (400 Bad Request). The error message should 
 * explicitly state that no single warehouse could fulfill the entire order. 
 * The system must not take X from A and Y from B.
 */

import { PrismaClient } from '@prisma/client';
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

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Make POST request to /orders endpoint
 */
async function createOrder(
  apiUrl: string,
  orderData: OrderRequest
): Promise<{ success: boolean; data?: any; error?: ErrorResponse; status?: number }> {
  try {
    const response = await fetch(`${apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data as ErrorResponse,
        status: response.status,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Main test function
 */
async function testNoSplitShipments() {
  console.log('='.repeat(70));
  console.log('TEST: The "No Split Shipments" Rule');
  console.log('='.repeat(70));
  console.log('\nScenario: Customer wants Item X and Item Y.');
  console.log('Warehouse A has Item X (but no Y).');
  console.log('Warehouse B has Item Y (but no X).');
  console.log('Expected: FAILURE (400) with clear error message.\n');

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Find warehouses and products
    console.log('Step 1: Verifying test data setup...');
    const warehouseA = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse A (New York)',
      },
    });

    const warehouseB = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse B (San Francisco)',
      },
    });

    if (!warehouseA || !warehouseB) {
      throw new Error('Warehouses not found. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    const productX = await prisma.product.findFirst({
      where: {
        sku: 'PROD-X',
      },
    });

    const productY = await prisma.product.findFirst({
      where: {
        sku: 'PROD-Y',
      },
    });

    if (!productX || !productY) {
      throw new Error('Products not found. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    // Verify inventory distribution
    const [inventoryXA, inventoryYA, inventoryXB, inventoryYB] = await Promise.all([
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseA.id,
            productId: productX.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseA.id,
            productId: productY.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseB.id,
            productId: productX.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseB.id,
            productId: productY.id,
          },
        },
      }),
    ]);

    console.log('\nStep 2: Verifying inventory distribution...');
    console.log(`  Warehouse A (NY):`);
    console.log(`    Item X: ${inventoryXA ? `${inventoryXA.quantity} units` : 'NOT AVAILABLE'} ${inventoryXA ? '✓' : '✗'}`);
    console.log(`    Item Y: ${inventoryYA ? `${inventoryYA.quantity} units` : 'NOT AVAILABLE'} ${!inventoryYA ? '✓' : '✗'}`);
    console.log(`  Warehouse B (SF):`);
    console.log(`    Item X: ${inventoryXB ? `${inventoryXB.quantity} units` : 'NOT AVAILABLE'} ${!inventoryXB ? '✓' : '✗'}`);
    console.log(`    Item Y: ${inventoryYB ? `${inventoryYB.quantity} units` : 'NOT AVAILABLE'} ${inventoryYB ? '✓' : '✗'}`);

    if (!inventoryXA || inventoryYA || inventoryXB || !inventoryYB) {
      throw new Error('Inventory distribution is incorrect. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    // Step 3: Attempt to create order with both items
    console.log('\nStep 3: Attempting to create order with both items...');
    const orderData: OrderRequest = {
      customer: {
        email: 'customer@example.com',
      },
      address: '123 Test St, Anywhere, USA',
      items: [
        {
          productId: productX.id,
          quantity: 1,
        },
        {
          productId: productY.id,
          quantity: 1,
        },
      ],
    };

    console.log(`  Customer: ${orderData.customer.email}`);
    console.log(`  Address: ${orderData.address}`);
    console.log(`  Items: 1x ${productX.name}, 1x ${productY.name}`);
    console.log(`  Sending POST request to ${apiUrl}/orders...\n`);

    const result = await createOrder(apiUrl, orderData);

    // Step 4: Verify the order was rejected
    console.log('Step 4: Verifying order rejection...');
    
    if (result.success) {
      console.log('  ✗ FAIL: Order was created successfully (should have failed)');
      throw new Error('Order should have been rejected but was created successfully');
    }

    console.log(`  Status Code: ${result.status} ${result.status === 400 ? '✓' : '✗'}`);
    
    if (result.error) {
      console.log(`  Error Message: ${result.error.error}`);
      console.log(`  Error Code: ${result.error.code || 'N/A'}`);
    }

    // Step 5: Verify error message mentions split shipments
    const errorMessage = result.error?.error || '';
    const mentionsSplitShipment = 
      errorMessage.toLowerCase().includes('split') ||
      errorMessage.toLowerCase().includes('single warehouse') ||
      errorMessage.toLowerCase().includes('no single warehouse');

    console.log(`  Error mentions split shipments: ${mentionsSplitShipment ? '✓' : '✗'}`);

    // Step 6: Verify no inventory was changed
    console.log('\nStep 5: Verifying no inventory was changed...');
    const [inventoryXAAfter, inventoryYBAfter] = await Promise.all([
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseA.id,
            productId: productX.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseB.id,
            productId: productY.id,
          },
        },
      }),
    ]);

    const inventoryUnchanged = 
      inventoryXAAfter?.quantity === inventoryXA.quantity &&
      inventoryYBAfter?.quantity === inventoryYB.quantity;

    console.log(`  Warehouse A Item X: ${inventoryXAAfter?.quantity} units (unchanged: ${inventoryXAAfter?.quantity === inventoryXA.quantity ? '✓' : '✗'})`);
    console.log(`  Warehouse B Item Y: ${inventoryYBAfter?.quantity} units (unchanged: ${inventoryYBAfter?.quantity === inventoryYB.quantity ? '✓' : '✗'})`);

    // Step 7: Test results summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));
    
    const results = {
      'Order was rejected (not created)': !result.success,
      'Status code is 400 Bad Request': result.status === 400,
      'Error message mentions split shipments': mentionsSplitShipment,
      'No inventory was changed': inventoryUnchanged,
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
    await testNoSplitShipments();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
