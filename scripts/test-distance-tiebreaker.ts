/**
 * Test Script: The Distance Tie-Breaker
 * 
 * Scenario: Customer is in Austin, TX.
 * 
 * Setup:
 * - Warehouse A (New York) has the items.
 * - Warehouse B (San Francisco) has the items.
 * - Warehouse C (Denver) has the items.
 * 
 * Action: Submit order with address "Austin, TX".
 * 
 * Expected Result: System selects Warehouse C (Denver) because it is 
 * geographically closest to Austin.
 */

import { PrismaClient } from '@prisma/client';
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
async function testDistanceTieBreaker() {
  console.log('='.repeat(70));
  console.log('TEST: The Distance Tie-Breaker');
  console.log('='.repeat(70));
  console.log('\nScenario: Customer is in Austin, TX.');
  console.log('All three warehouses have the items.');
  console.log('Expected: System selects Warehouse C (Denver) - closest to Austin.\n');

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Find warehouses and test product
    console.log('Step 1: Verifying test data setup...');
    const warehouseNY = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse A (New York)',
      },
    });

    const warehouseSF = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse B (San Francisco)',
      },
    });

    const warehouseDenver = await prisma.warehouse.findFirst({
      where: {
        name: 'Warehouse C (Denver)',
      },
    });

    if (!warehouseNY || !warehouseSF || !warehouseDenver) {
      throw new Error('Warehouses not found. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    const testProduct = await prisma.product.findFirst({
      where: {
        sku: 'PROD-TIEBREAKER',
      },
    });

    if (!testProduct) {
      throw new Error('Tie-Breaker Product not found. Please run: pnpm ts-node scripts/setup-phase2-test-data.ts');
    }

    // Step 2: Calculate distances from Austin, TX to each warehouse
    console.log('\nStep 2: Calculating distances from Austin, TX...');
    const austinLat = 30.2672;
    const austinLng = -97.7431;

    const distanceToNY = calculateHaversineDistance(
      austinLat,
      austinLng,
      warehouseNY.latitude,
      warehouseNY.longitude
    );

    const distanceToSF = calculateHaversineDistance(
      austinLat,
      austinLng,
      warehouseSF.latitude,
      warehouseSF.longitude
    );

    const distanceToDenver = calculateHaversineDistance(
      austinLat,
      austinLng,
      warehouseDenver.latitude,
      warehouseDenver.longitude
    );

    console.log(`  Distance to Warehouse A (NY): ${distanceToNY.toFixed(2)} km`);
    console.log(`  Distance to Warehouse B (SF): ${distanceToSF.toFixed(2)} km`);
    console.log(`  Distance to Warehouse C (Denver): ${distanceToDenver.toFixed(2)} km`);
    
    const expectedWarehouse = distanceToDenver < distanceToNY && distanceToDenver < distanceToSF
      ? warehouseDenver
      : distanceToNY < distanceToSF ? warehouseNY : warehouseSF;
    
    console.log(`  Expected closest: ${expectedWarehouse.name} (${expectedWarehouse === warehouseDenver ? 'Denver' : expectedWarehouse === warehouseNY ? 'NY' : 'SF'})`);

    // Step 3: Create order from Austin, TX
    console.log('\nStep 3: Creating order from Austin, TX...');
    const orderData: OrderRequest = {
      customer: {
        email: 'customer@austin.com',
      },
      address: 'Austin, TX',
      items: [
        {
          productId: testProduct.id,
          quantity: 1,
        },
      ],
    };

    console.log(`  Customer: ${orderData.customer.email}`);
    console.log(`  Address: ${orderData.address}`);
    console.log(`  Items: 1x ${testProduct.name}`);
    console.log(`  Sending POST request to ${apiUrl}/orders...\n`);

    const orderResponse = await createOrder(apiUrl, orderData);

    // Step 4: Verify which warehouse was selected
    console.log('Step 4: Verifying warehouse selection...');
    console.log(`  Order ID: ${orderResponse.id}`);
    console.log(`  Order Status: ${orderResponse.status}`);

    // We need to check which warehouse's inventory was decremented
    // Check inventory in all three warehouses
    const [inventoryNY, inventorySF, inventoryDenver] = await Promise.all([
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseNY.id,
            productId: testProduct.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseSF.id,
            productId: testProduct.id,
          },
        },
      }),
      prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouseDenver.id,
            productId: testProduct.id,
          },
        },
      }),
    ]);

    // Determine which warehouse was used (inventory decreased by 1)
    let selectedWarehouse: typeof warehouseNY | typeof warehouseSF | typeof warehouseDenver | null = null;
    let selectedWarehouseName = '';

    if (inventoryNY && inventoryNY.quantity === 19) {
      selectedWarehouse = warehouseNY;
      selectedWarehouseName = 'Warehouse A (New York)';
    } else if (inventorySF && inventorySF.quantity === 19) {
      selectedWarehouse = warehouseSF;
      selectedWarehouseName = 'Warehouse B (San Francisco)';
    } else if (inventoryDenver && inventoryDenver.quantity === 19) {
      selectedWarehouse = warehouseDenver;
      selectedWarehouseName = 'Warehouse C (Denver)';
    }

    console.log(`\n  Inventory after order:`);
    console.log(`    Warehouse A (NY): ${inventoryNY?.quantity} units ${inventoryNY?.quantity === 19 ? '(decremented)' : ''}`);
    console.log(`    Warehouse B (SF): ${inventorySF?.quantity} units ${inventorySF?.quantity === 19 ? '(decremented)' : ''}`);
    console.log(`    Warehouse C (Denver): ${inventoryDenver?.quantity} units ${inventoryDenver?.quantity === 19 ? '(decremented)' : ''}`);

    if (!selectedWarehouse) {
      throw new Error('Could not determine which warehouse was selected (no inventory decremented)');
    }

    console.log(`\n  Selected Warehouse: ${selectedWarehouseName}`);
    console.log(`  Expected Warehouse: ${expectedWarehouse.name}`);

    const correctSelection = selectedWarehouse.id === expectedWarehouse.id;
    console.log(`  Correct selection: ${correctSelection ? '✓' : '✗'}`);

    // Step 5: Test results summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));
    
    const results = {
      'Order created successfully': !!orderResponse.id,
      'Warehouse selected correctly (Denver is closest)': correctSelection,
      'Only one warehouse inventory decremented': 
        (inventoryNY?.quantity === 19 ? 1 : 0) +
        (inventorySF?.quantity === 19 ? 1 : 0) +
        (inventoryDenver?.quantity === 19 ? 1 : 0) === 1,
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
    await testDistanceTieBreaker();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
