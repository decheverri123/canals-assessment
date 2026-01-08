/**
 * Test Script: The "Perfect" Order
 * 
 * Scenario: A customer in New York orders 1 unit of "Product A".
 * 
 * Setup: Ensure "Warehouse NY" has 10 units of "Product A".
 * Action: Submit a valid order payload.
 * 
 * Expected Result:
 * - Response is 201 Created
 * - Response JSON includes an Order ID
 * - Database Orders table shows status PAID
 * - Database Inventory for Warehouse NY decreases from 10 to 9
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
async function testPerfectOrder() {
  console.log('='.repeat(70));
  console.log('TEST: The "Perfect" Order');
  console.log('='.repeat(70));
  console.log('\nScenario: A customer in New York orders 1 unit of "Product A".\n');

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Find Warehouse NY and Product A
    console.log('Step 1: Verifying test data setup...');
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

    const productA = await prisma.product.findFirst({
      where: {
        sku: 'PROD-A',
      },
    });

    if (!productA) {
      throw new Error('Product A not found. Please run: pnpm ts-node scripts/setup-test-data.ts');
    }

    // Step 2: Check initial inventory
    console.log('Step 2: Checking initial inventory...');
    const initialInventory = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseNY.id,
          productId: productA.id,
        },
      },
    });

    if (!initialInventory) {
      throw new Error('Inventory not found for Product A in Warehouse NY');
    }

    const initialQuantity = initialInventory.quantity;
    console.log(`  Initial inventory: ${initialQuantity} units of Product A in Warehouse NY`);

    if (initialQuantity < 1) {
      throw new Error(`Insufficient inventory: ${initialQuantity} units available, need at least 1`);
    }

    // Step 3: Create order
    console.log('\nStep 3: Creating order...');
    const orderData: OrderRequest = {
      customer: {
        email: 'customer@example.com',
      },
      address: '123 Main St, New York, NY 10001',
      items: [
        {
          productId: productA.id,
          quantity: 1,
        },
      ],
    };

    console.log(`  Customer: ${orderData.customer.email}`);
    console.log(`  Address: ${orderData.address}`);
    console.log(`  Items: 1x Product A (${productA.name})`);
    console.log(`  Sending POST request to ${apiUrl}/orders...\n`);

    const orderResponse = await createOrder(apiUrl, orderData);

    // Step 4: Verify response
    console.log('Step 4: Verifying response...');
    console.log(`  Status Code: 201 Created ${orderResponse.id ? '✓' : '✗'}`);
    console.log(`  Order ID: ${orderResponse.id} ${orderResponse.id ? '✓' : '✗'}`);
    console.log(`  Order Status: ${orderResponse.status} ${orderResponse.status === 'PAID' ? '✓' : '✗'}`);
    console.log(`  Total Amount: ${formatCurrency(orderResponse.totalAmount)}`);

    // Step 5: Verify database state
    console.log('\nStep 5: Verifying database state...');
    
    // Check order status in database
    const orderInDb = await prisma.order.findUnique({
      where: {
        id: orderResponse.id,
      },
    });

    if (!orderInDb) {
      throw new Error('Order not found in database');
    }

    console.log(`  Order status in DB: ${orderInDb.status} ${orderInDb.status === OrderStatus.PAID ? '✓' : '✗'}`);

    // Check inventory after order
    const updatedInventory = await prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: warehouseNY.id,
          productId: productA.id,
        },
      },
    });

    if (!updatedInventory) {
      throw new Error('Inventory not found after order');
    }

    const finalQuantity = updatedInventory.quantity;
    const expectedQuantity = initialQuantity - 1;
    
    console.log(`  Initial inventory: ${initialQuantity} units`);
    console.log(`  Final inventory: ${finalQuantity} units`);
    console.log(`  Expected inventory: ${expectedQuantity} units`);
    console.log(`  Inventory decreased correctly: ${finalQuantity === expectedQuantity ? '✓' : '✗'}`);

    // Step 6: Test results summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));
    
    const results = {
      'Response is 201 Created': orderResponse.id ? true : false,
      'Response includes Order ID': !!orderResponse.id,
      'Order status is PAID': orderInDb.status === OrderStatus.PAID,
      'Inventory decreased from 10 to 9': finalQuantity === expectedQuantity,
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
    await testPerfectOrder();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
