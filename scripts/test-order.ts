/**
 * Test script for POST /orders endpoint
 * Fetches products from database and creates test orders with formatted output
 * 
 * Usage:
 *   pnpm ts-node scripts/test-order.ts
 *   pnpm ts-node scripts/test-order.ts --email test@example.com --address "123 Main St, NYC"
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
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
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Print formatted order response
 */
function printOrderResponse(order: OrderResponse): void {
  console.log('\n' + '='.repeat(60));
  console.log('ORDER CREATED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`Order ID:        ${order.id}`);
  console.log(`Customer Email:  ${order.customerEmail}`);
  console.log(`Shipping To:     ${order.shippingAddress}`);
  console.log(`Total Amount:    ${formatCurrency(order.totalAmount)}`);
  console.log(`Status:          ${order.status}`);
  console.log(`Created At:      ${formatDate(order.createdAt)}`);
  console.log('\nOrder Items:');
  console.log('-'.repeat(60));
  
  let itemTotal = 0;
  order.orderItems.forEach((item, index) => {
    const itemPrice = formatCurrency(item.priceAtPurchase);
    const itemSubtotal = formatCurrency(item.priceAtPurchase * item.quantity);
    itemTotal += item.priceAtPurchase * item.quantity;
    console.log(`${index + 1}. Product ID: ${item.productId}`);
    console.log(`   Quantity: ${item.quantity} × ${itemPrice} = ${itemSubtotal}`);
  });
  
  console.log('-'.repeat(60));
  console.log(`Total: ${formatCurrency(order.totalAmount)}`);
  console.log('='.repeat(60) + '\n');
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
 * Main function
 */
async function main() {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const customerEmail = process.argv.includes('--email')
      ? process.argv[process.argv.indexOf('--email') + 1]
      : 'test@example.com';
    const shippingAddress = process.argv.includes('--address')
      ? process.argv[process.argv.indexOf('--address') + 1]
      : '123 Main St, New York, NY 10001';

    console.log('Fetching products from database...\n');
    
    // Fetch all products
    const products = await prisma.product.findMany({
      orderBy: {
        sku: 'asc',
      },
    });

    if (products.length === 0) {
      console.error('No products found in database. Please run the seed script first:');
      console.error('  pnpm prisma db seed');
      process.exit(1);
    }

    console.log('Available Products:');
    console.log('-'.repeat(60));
    products.forEach((product, index) => {
      console.log(
        `${index + 1}. ${product.sku} - ${product.name} (${formatCurrency(product.price)}) [ID: ${product.id}]`
      );
    });
    console.log('-'.repeat(60) + '\n');

    // Create order with first 2-3 products
    const itemsToOrder = products.slice(0, Math.min(3, products.length)).map((product, index) => ({
      productId: product.id,
      quantity: index + 1, // Vary quantities: 1, 2, 3
    }));

    const orderData: OrderRequest = {
      customer: {
        email: customerEmail,
      },
      address: shippingAddress,
      items: itemsToOrder,
    };

    console.log('Creating order with the following items:');
    itemsToOrder.forEach((item, index) => {
      const product = products.find((p) => p.id === item.productId)!;
      console.log(
        `  ${index + 1}. ${product.name} (${product.sku}) - Quantity: ${item.quantity}`
      );
    });
    console.log('');

    console.log(`Sending request to ${apiUrl}/orders...\n`);

    const order = await createOrder(apiUrl, orderData);

    printOrderResponse(order);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.message.includes('fetch')) {
      console.error('\nMake sure the server is running:');
      console.error('  pnpm dev');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
