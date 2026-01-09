/**
 * UI formatting utilities
 * Colors and formatted output for CLI display
 */

import pc from 'picocolors';
import type { OrderItem, OrderResponse, Warehouse } from '../types/cli.types';
import { maskCreditCard } from '../prompts/payment.prompt';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
export function displayOrderSuccess(order: OrderResponse): void {
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
    const subtotal = item.priceAtPurchase * item.quantity;
    console.log(`     - ${item.quantity}x ${item.productName}: ${pc.green(formatPrice(subtotal))}`);
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

// Removed displayProducts - not currently used

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

/**
 * Geocode address to coordinates (matching server-side logic)
 */
function geocodeAddress(address: string): { latitude: number; longitude: number } {
  const addressLower = address.toLowerCase();

  if (
    addressLower.includes('los angeles') ||
    addressLower.includes('la,') ||
    (addressLower.includes(', ca') && !addressLower.includes('sacramento'))
  ) {
    return { latitude: 34.0522, longitude: -118.2437 };
  }

  if (addressLower.includes('chicago') || addressLower.includes(', il')) {
    return { latitude: 41.8781, longitude: -87.6298 };
  }

  return { latitude: 40.7128, longitude: -74.0060 };
}

/**
 * Display warehouse inventory overview
 * Shows all warehouses with inventory for selected products
 */
export function displayWarehouseInventory(
  warehouses: Warehouse[],
  selectedItems: OrderItem[],
  customerAddress: string
): void {
  const divider = pc.dim('-'.repeat(70));
  const customerCoords = geocodeAddress(customerAddress);

  console.log('');
  console.log(pc.bold(pc.cyan('[📦] Warehouse Inventory Overview')));
  console.log(divider);

  // Calculate distances and determine which warehouse would be selected
  const warehousesWithDistance = warehouses.map((warehouse) => {
    const distance = calculateDistance(
      customerCoords.latitude,
      customerCoords.longitude,
      warehouse.latitude,
      warehouse.longitude
    );

    // Check if warehouse has all selected items
    const hasAllItems = selectedItems.every((item) => {
      const inventory = warehouse.inventory.find(
        (inv) => inv.productId === item.product.id
      );
      return inventory && inventory.quantity >= item.quantity;
    });

    return {
      warehouse,
      distance,
      hasAllItems,
    };
  });

  // Sort by distance
  warehousesWithDistance.sort((a, b) => a.distance - b.distance);

  // Find the selected warehouse (closest with all items)
  const selectedWarehouse = warehousesWithDistance.find((w) => w.hasAllItems);

  // Display each warehouse
  for (const { warehouse, distance, hasAllItems } of warehousesWithDistance) {
    const isSelected = selectedWarehouse?.warehouse.id === warehouse.id;
    const distanceStr = `${distance.toFixed(1)} km`;
    const statusBadge = isSelected
      ? pc.bgGreen(pc.black(' SELECTED '))
      : hasAllItems
      ? pc.bgYellow(pc.black(' AVAILABLE '))
      : pc.bgRed(pc.white(' INSUFFICIENT '));

    console.log('');
    console.log(
      `   ${pc.bold(warehouse.name)} ${statusBadge} ${pc.dim(`(${distanceStr})`)}`
    );
    console.log(`   ${pc.dim(warehouse.address)}`);

    // Display inventory for selected products
    console.log(`   ${pc.dim('Inventory:')}`);
    for (const item of selectedItems) {
      const inventory = warehouse.inventory.find(
        (inv) => inv.productId === item.product.id
      );
      const available = inventory?.quantity ?? 0;
      const requested = item.quantity;
      const hasEnough = available >= requested;

      const productLine = `     • ${item.product.name}:`;
      const inventoryDisplay = hasEnough
        ? pc.green(`${requested}/${available}`)
        : pc.red(`${requested}/${available}`);

      console.log(`${productLine.padEnd(45)} ${inventoryDisplay}`);
    }
  }

  if (selectedWarehouse) {
    console.log('');
    console.log(
      pc.dim(
        `   → Order will be fulfilled from: ${pc.cyan(selectedWarehouse.warehouse.name)}`
      )
    );
  } else {
    console.log('');
    console.log(
      pc.red(
        '   ⚠ No single warehouse has all requested items in sufficient quantity'
      )
    );
  }

  console.log('');
  console.log(divider);
}
