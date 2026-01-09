/**
 * UI formatting utilities
 * Colors and formatted output for CLI display
 */

import pc from 'picocolors';
import type { OrderItem, OrderResponse, Product } from '../types/cli.types';
import { maskCreditCard } from '../prompts/payment.prompt';

/**
 * Format price from cents to dollars
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Display order summary before confirmation
 */
export function displayOrderSummary(
  items: OrderItem[],
  address: string,
  email: string,
  creditCard: string
): void {
  const divider = pc.dim('-'.repeat(50));

  console.log('');
  console.log(pc.bold(pc.cyan('[i] Order Summary')));
  console.log(divider);

  // Items
  let total = 0;
  for (const item of items) {
    const subtotal = item.product.price * item.quantity;
    total += subtotal;
    const line = `   ${item.quantity}x ${item.product.name}`;
    const price = formatPrice(subtotal);
    console.log(`${line.padEnd(40)} ${pc.green(price)}`);
  }

  console.log(divider);
  console.log(`   ${pc.bold('Total:'.padEnd(37))} ${pc.bold(pc.green(formatPrice(total)))}`);
  console.log('');

  // Customer info
  console.log(pc.dim('   Shipping to:  ') + address);
  console.log(pc.dim('   Email:        ') + email);
  console.log(pc.dim('   Card:         ') + maskCreditCard(creditCard));
  console.log('');
}

/**
 * Display successful order response
 */
export function displayOrderSuccess(order: OrderResponse, products: Product[]): void {
  const divider = pc.dim('='.repeat(50));

  console.log('');
  console.log(divider);
  console.log(pc.bold(pc.green('[+] Order Created Successfully!')));
  console.log(divider);
  console.log('');

  // Order details
  console.log(`   ${pc.dim('Order ID:')}      ${pc.cyan(order.id)}`);
  console.log(`   ${pc.dim('Status:')}        ${getStatusBadge(order.status)}`);
  console.log(`   ${pc.dim('Created:')}       ${formatDate(order.createdAt)}`);
  console.log('');

  // Warehouse
  console.log(`   ${pc.dim('Warehouse:')}     ${pc.yellow(order.warehouse.name)}`);
  console.log(`   ${pc.dim('Location:')}      ${order.warehouse.address}`);
  console.log('');

  // Items
  console.log(`   ${pc.dim('Items:')}`);
  for (const item of order.orderItems) {
    const product = products.find((p) => p.id === item.productId);
    const name = product?.name || item.productId;
    const subtotal = item.priceAtPurchase * item.quantity;
    console.log(`     - ${item.quantity}x ${name}: ${pc.green(formatPrice(subtotal))}`);
  }
  console.log('');

  // Total
  console.log(`   ${pc.dim('Total Amount:')}  ${pc.bold(pc.green(formatPrice(order.totalAmount)))}`);
  console.log('');

  // Shipping
  console.log(`   ${pc.dim('Ship To:')}       ${order.shippingAddress}`);
  console.log(`   ${pc.dim('Email:')}         ${order.customerEmail}`);

  console.log('');
  console.log(divider);
}

/**
 * Display error message
 */
export function displayError(message: string): void {
  console.log('');
  console.log(pc.bold(pc.red('[x] Error: ')) + message);
  console.log('');
}

/**
 * Get colored status badge
 */
function getStatusBadge(status: string): string {
  switch (status.toUpperCase()) {
    case 'PAID':
      return pc.bgGreen(pc.black(` ${status} `));
    case 'PENDING':
      return pc.bgYellow(pc.black(` ${status} `));
    case 'FAILED':
      return pc.bgRed(pc.white(` ${status} `));
    default:
      return pc.gray(`[${status}]`);
  }
}

/**
 * Display available products list
 */
export function displayProducts(products: Product[]): void {
  console.log('');
  console.log(pc.dim('Available Products:'));
  for (const product of products) {
    console.log(`   - ${product.name} ${pc.dim(`(${product.sku})`)} ${pc.green(formatPrice(product.price))}`);
  }
  console.log('');
}

/**
 * Display the raw curl command
 */
export function displayCurlCommand(curlCommand: string): void {
  const divider = pc.dim('-'.repeat(50));
  
  console.log('');
  console.log(pc.bold(pc.magenta('[>] Curl Command')));
  console.log(divider);
  console.log('');
  console.log(pc.cyan(curlCommand));
  console.log('');
  console.log(divider);
}

/**
 * Display raw JSON response
 */
export function displayRawResponse(rawResponse: string): void {
  const divider = pc.dim('-'.repeat(50));
  
  console.log('');
  console.log(pc.bold(pc.magenta('[<] Raw Response')));
  console.log(divider);
  console.log('');
  // Colorize the JSON
  const colorizedJson = colorizeJson(rawResponse);
  console.log(colorizedJson);
  console.log('');
  console.log(divider);
}

/**
 * Simple JSON colorizer for terminal output
 */
function colorizeJson(jsonString: string): string {
  return jsonString
    // Colorize keys
    .replace(/"([^"]+)":/g, `${pc.cyan('"$1"')}:`)
    // Colorize string values
    .replace(/: "([^"]+)"/g, `: ${pc.green('"$1"')}`)
    // Colorize numbers
    .replace(/: (\d+)/g, `: ${pc.yellow('$1')}`)
    // Colorize booleans
    .replace(/: (true|false)/g, `: ${pc.magenta('$1')}`)
    // Colorize null
    .replace(/: (null)/g, `: ${pc.dim('$1')}`);
}
