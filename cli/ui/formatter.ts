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
 * Create a box with optional colored border
 */
function createBox(
  lines: string[],
  width: number,
  borderColor: (s: string) => string = pc.dim,
  title?: string
): string[] {
  const horizontalLine = borderColor('─'.repeat(width - 2));
  const topLeft = borderColor('┌');
  const topRight = borderColor('┐');
  const bottomLeft = borderColor('└');
  const bottomRight = borderColor('┘');
  const vertical = borderColor('│');

  const output: string[] = [];

  // Top border with optional title
  if (title) {
    const titleText = ` ${title} `;
    const remainingWidth = width - 4 - titleText.length;
    const leftPad = Math.floor(remainingWidth / 2);
    const rightPad = remainingWidth - leftPad;
    output.push(
      topLeft +
        borderColor('─'.repeat(leftPad)) +
        borderColor(titleText) +
        borderColor('─'.repeat(rightPad)) +
        topRight
    );
  } else {
    output.push(topLeft + horizontalLine + topRight);
  }

  // Content lines
  for (const line of lines) {
    // Strip ANSI codes for length calculation
    const visibleLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = width - 4 - visibleLength;
    output.push(vertical + ' ' + line + ' '.repeat(Math.max(0, padding)) + ' ' + vertical);
  }

  // Bottom border
  output.push(bottomLeft + horizontalLine + bottomRight);

  return output;
}

/**
 * Display warehouse selection boxes after order completion
 * Shows all warehouses with the selected one highlighted in green
 */
export function displayWarehouseBoxes(
  warehouses: Warehouse[],
  selectedItems: OrderItem[],
  selectedWarehouseId: string,
  customerAddress: string
): void {
  const customerCoords = geocodeAddress(customerAddress);
  const boxWidth = 42;

  console.log('');
  console.log(pc.bold(pc.cyan('[*] Warehouse Selection')));
  console.log('');

  // Calculate distances for each warehouse
  const warehousesWithDistance = warehouses.map((warehouse) => {
    const distance = calculateDistance(
      customerCoords.latitude,
      customerCoords.longitude,
      warehouse.latitude,
      warehouse.longitude
    );

    const hasAllItems = selectedItems.every((item) => {
      const inventory = warehouse.inventory.find(
        (inv) => inv.productId === item.product.id
      );
      return inventory && inventory.quantity >= item.quantity;
    });

    return { warehouse, distance, hasAllItems };
  });

  // Sort by distance
  warehousesWithDistance.sort((a, b) => a.distance - b.distance);

  // Create boxes side by side
  const allBoxLines: string[][] = [];

  for (const { warehouse, distance, hasAllItems } of warehousesWithDistance) {
    const isSelected = warehouse.id === selectedWarehouseId;
    const borderColor = isSelected ? pc.green : pc.dim;
    
    const lines: string[] = [];
    
    // Warehouse name and distance
    lines.push(pc.bold(warehouse.name));
    lines.push(pc.dim(`${distance.toFixed(1)} km away`));
    lines.push('');
    
    // Location (truncated if needed)
    const location = warehouse.address.length > boxWidth - 6 
      ? warehouse.address.substring(0, boxWidth - 9) + '...'
      : warehouse.address;
    lines.push(pc.dim('Location:'));
    lines.push(location);
    lines.push('');
    
    // Inventory status
    lines.push(pc.dim('Inventory:'));
    for (const item of selectedItems) {
      const inventory = warehouse.inventory.find(
        (inv) => inv.productId === item.product.id
      );
      const available = inventory?.quantity ?? 0;
      const requested = item.quantity;
      const hasEnough = available >= requested;
      
      const productName = item.product.name.length > 20 
        ? item.product.name.substring(0, 17) + '...'
        : item.product.name;
      
      const status = hasEnough 
        ? pc.green(`[${requested}/${available}]`)
        : pc.red(`[${requested}/${available}]`);
      
      lines.push(`  ${productName} ${status}`);
    }
    lines.push('');
    
    // Status badge
    if (isSelected) {
      lines.push(pc.green(pc.bold('[+] SELECTED')));
    } else if (hasAllItems) {
      lines.push(pc.yellow('[~] Available'));
    } else {
      lines.push(pc.red('[-] Insufficient'));
    }

    const title = isSelected ? 'SELECTED' : undefined;
    const boxLines = createBox(lines, boxWidth, borderColor, title);
    allBoxLines.push(boxLines);
  }

  // Print boxes side by side if terminal is wide enough, otherwise vertically
  const terminalWidth = process.stdout.columns || 120;
  const totalBoxWidth = boxWidth * allBoxLines.length + (allBoxLines.length - 1) * 2;

  if (terminalWidth >= totalBoxWidth && allBoxLines.length > 0) {
    // Print side by side
    const maxLines = Math.max(...allBoxLines.map(b => b.length));
    for (let i = 0; i < maxLines; i++) {
      const row = allBoxLines.map(box => {
        if (i < box.length) {
          return box[i];
        }
        return ' '.repeat(boxWidth);
      }).join('  ');
      console.log('  ' + row);
    }
  } else {
    // Print vertically
    for (const boxLines of allBoxLines) {
      for (const line of boxLines) {
        console.log('  ' + line);
      }
      console.log('');
    }
  }

  console.log('');
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
  console.log(pc.bold(pc.cyan('[#] Warehouse Inventory Overview')));
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
        '   [!] No single warehouse has all requested items in sufficient quantity'
      )
    );
  }

  console.log('');
  console.log(divider);
}
