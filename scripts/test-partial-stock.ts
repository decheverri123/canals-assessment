/**
 * Test Script: The "Partial Stock" Rejection
 * 
 * Scenario: Customer wants 5 units of "Product A".
 * 
 * Setup: The closest warehouse only has 4 units left. 
 * A further warehouse has 10 units.
 * 
 * Action: Submit order for 5 units.
 * 
 * Expected Result: Success, but filled by the further warehouse. 
 * The system correctly identified the closest warehouse didn't have 
 * enough stock and skipped it.
 */

import { PrismaClient, OrderStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import { calculateHaversineDistance } from '../src/utils/haversine';

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
async function testPartialStock() {
  console.log('='.repeat(70));
  console.log('TEST: The "Partial Stock" Rejection');
  console.log('='.repeat(70));
  console.log('\nScenario: Customer wants 5 units of "Product A".');
  console.log('Closest warehouse has only 4 units.');
  console.log('Further warehouse has 10 units.');
  console.log('Expected: Success, filled by the further warehouse.\n');

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Find warehouses and product
    console.log('Step 1: Verifying test data setup...');
    const warehouseDenver = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse C (Denver)',
      },
    });

    const warehouseNY = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse A (New York)',
      },
    });

    if (!warehouseDenver || !warehouseNY) {
      throw new Error('Warehouses not found. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    const productA = await prisma.product.findFirst({
      where: {
        sku: 'PROD-A',
      },
    });

    if (!productA) {
      throw new Error('Product A not found. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    // Step 2: Check initial inventory
    console.log('\nStep 2: Checking initial inventory...');
    const [inventoryDenver, inventoryNY] = await Promise.all([
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseDenver.id,
            productId: productA.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: productA.id,
          },
        },
      }),
    ]);

    if (!inventoryDenver || !inventoryNY) {
      throw new Error('Inventory not found. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    const initialDenverQty = inventoryDenver.quantity;
    const initialNYQty = inventoryNY.quantity;

    console.log(`  Warehouse C (Denver): ${initialDenverQty} units ${initialDenverQty === 4 ? '✓' : '✗ (expected 4)'}`);
    console.log(`  Warehouse A (NY): ${initialNYQty} units ${initialNYQty === 10 ? '✓' : '✗ (expected 10)'}`);

    if (initialDenverQty !== 4 || initialNYQty !== 10) {
      throw new Error('Inventory quantities are incorrect. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    // Step 3: Calculate distances from a location closer to Denver
    // Use a location in Colorado (closer to Denver than NY)
    console.log('\nStep 3: Calculating distances...');
    const customerLat = 39.0; // Colorado
    const customerLng = -105.0;

    const distanceToDenver = calculateHaversineDistance(
      customerLat,
      customerLng,
      warehouseDenver.latitude,
      warehouseDenver.longitude
    );

    const distanceToNY = calculateHaversineDistance(
      customerLat,
      customerLng,
      warehouseNY.latitude,
      warehouseNY.longitude
    );

    console.log(`  Customer location: ${customerLat}, ${customerLng} (Colorado)`);
    console.log(`  Distance to Warehouse C (Denver): ${distanceToDenver.toFixed(2)} km`);
    console.log(`  Distance to Warehouse A (NY): ${distanceToNY.toFixed(2)} km`);
    console.log(`  Denver is closer: ${distanceToDenver < distanceToNY ? '✓' : '✗'}`);

    // Step 4: Create order for 5 units
    console.log('\nStep 4: Creating order for 5 units...');
    const orderData: OrderRequest = {
      customer: {
        email: 'customer@colorado.com',
      },
      address: 'Denver, CO', // This will geocode to Denver area
      items: [
        {
          productId: productA.id,
          quantity: 5,
        },
      ],
    };

    console.log(`  Customer: ${orderData.customer.email}`);
    console.log(`  Address: ${orderData.address}`);
    console.log(`  Items: 5x ${productA.name}`);
    console.log(`  Sending POST request to ${apiUrl}/orders...\n`);

    const orderResponse = await createOrder(apiUrl, orderData);

    // Step 5: Verify order was created successfully
    console.log('Step 5: Verifying order creation...');
    console.log(`  Order ID: ${orderResponse.id} ${orderResponse.id ? '✓' : '✗'}`);
    console.log(`  Order Status: ${orderResponse.status} ${orderResponse.status === 'PAID' ? '✓' : '✗'}`);
    console.log(`  Total Amount: ${formatCurrency(orderResponse.totalAmount)}`);

    // Step 6: Verify which warehouse was used
    console.log('\nStep 6: Verifying warehouse selection...');
    const [updatedInventoryDenver, updatedInventoryNY] = await Promise.all([
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseDenver.id,
            productId: productA.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: productA.id,
          },
        },
      }),
    ]);

    if (!updatedInventoryDenver || !updatedInventoryNY) {
      throw new Error('Inventory not found after order');
    }

    const finalDenverQty = updatedInventoryDenver.quantity;
    const finalNYQty = updatedInventoryNY.quantity;

    console.log(`  Warehouse C (Denver): ${initialDenverQty} → ${finalDenverQty} units`);
    console.log(`  Warehouse A (NY): ${initialNYQty} → ${finalNYQty} units`);

    // Determine which warehouse was used
    const denverUsed = finalDenverQty === initialDenverQty - 5;
    const nyUsed = finalNYQty === initialNYQty - 5;

    if (denverUsed && nyUsed) {
      throw new Error('Both warehouses were used (split shipment detected)');
    }

    if (!denverUsed && !nyUsed) {
      throw new Error('No warehouse inventory was decremented');
    }

    const correctWarehouseUsed = nyUsed; // NY should be used (has enough stock)
    const closestWarehouseSkipped = !denverUsed; // Denver should be skipped (not enough stock)

    console.log(`\n  Closest warehouse (Denver) skipped: ${closestWarehouseSkipped ? '✓' : '✗'}`);
    console.log(`  Further warehouse (NY) used: ${correctWarehouseUsed ? '✓' : '✗'}`);

    // Step 7: Verify order in database
    console.log('\nStep 7: Verifying order in database...');
    const orderInDb = await prisma.order.findUnique({
      where: {
        id: orderResponse.id,
      },
    });

    if (!orderInDb) {
      throw new Error('Order not found in database');
    }

    console.log(`  Order status in DB: ${orderInDb.status} ${orderInDb.status === OrderStatus.PAID ? '✓' : '✗'}`);

    // Step 8: Test results summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));
    
    const results = {
      'Order created successfully': !!orderResponse.id,
      'Order status is PAID': orderInDb.status === OrderStatus.PAID,
      'Closest warehouse (Denver) was skipped (insufficient stock)': closestWarehouseSkipped,
      'Further warehouse (NY) was used (sufficient stock)': correctWarehouseUsed,
      'Correct quantity deducted (5 units)': 
        (denverUsed && finalDenverQty === initialDenverQty - 5) ||
        (nyUsed && finalNYQty === initialNYQty - 5),
      'No split shipment occurred': !(denverUsed && nyUsed),
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
    await testPartialStock();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
