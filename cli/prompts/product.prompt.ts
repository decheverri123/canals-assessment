/**
 * Product selection prompts
 * Multi-select products and set quantities
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { DEFAULTS } from '../config/defaults';
import type { Product, OrderItem } from '../types/cli.types';

/**
 * Format price from cents to dollars
 */
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Prompt user to select products from available list
 */
export async function selectProducts(products: Product[]): Promise<Product[]> {
  const options = products.map((product) => ({
    value: product,
    label: `${product.name}`,
    hint: pc.dim(formatPrice(product.price)),
  }));

  p.note(
    pc.dim('Use arrow keys to navigate, Space to select, Enter to confirm'),
    'Product Selection'
  );

  const selected = await p.multiselect({
    message: 'Select products to order (multiple allowed)',
    options,
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel('Order cancelled.');
    process.exit(0);
  }

  return selected as Product[];
}

/**
 * Calculate running total from order items
 */
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

/**
 * Display running total
 */
function displayRunningTotal(items: OrderItem[]): void {
  if (items.length === 0) return;
  
  const total = calculateTotal(items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  console.log('');
  console.log(pc.dim('  -------------------------'));
  console.log(`  ${pc.dim('Cart:')} ${itemCount} item${itemCount !== 1 ? 's' : ''} | ${pc.bold(pc.green(formatPrice(total)))}`);
  console.log('');
}

/**
 * Prompt user to set quantity for each selected product
 */
export async function setQuantities(products: Product[]): Promise<OrderItem[]> {
  const items: OrderItem[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    // Show running total if we have items
    displayRunningTotal(items);
    
    const quantity = await p.text({
      message: `[${i + 1}/${products.length}] Quantity for ${pc.cyan(product.name)} ${pc.dim(formatPrice(product.price))} ${pc.dim(`(default: ${DEFAULTS.quantity})`)}`,
      placeholder: 'Press Enter for 1',
      validate: (value) => {
        const valToCheck = value.trim() || String(DEFAULTS.quantity);
        const num = parseInt(valToCheck, 10);
        if (isNaN(num) || num < 1) {
          return 'Please enter a positive number';
        }
        if (!Number.isInteger(num)) {
          return 'Quantity must be a whole number';
        }
        return undefined;
      },
    });

    if (p.isCancel(quantity)) {
      p.cancel('Order cancelled.');
      process.exit(0);
    }

    const result = (quantity as string | undefined)?.trim();
    const qty = result ? parseInt(result, 10) : DEFAULTS.quantity;
    
    items.push({
      product,
      quantity: qty,
    });
    
    // Show item added confirmation with subtotal
    const subtotal = product.price * qty;
    console.log(pc.dim(`  + ${qty}x ${product.name}: ${formatPrice(subtotal)}`));
  }

  // Show final total
  displayRunningTotal(items);

  return items;
}
