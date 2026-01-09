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
 * Prompt user to set quantity for each selected product
 */
export async function setQuantities(products: Product[]): Promise<OrderItem[]> {
  const items: OrderItem[] = [];

  for (const product of products) {
    const quantity = await p.text({
      message: `Quantity for ${pc.cyan(product.name)} ${pc.dim(formatPrice(product.price))} ${pc.dim(`(default: ${DEFAULTS.quantity})`)}`,
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
    items.push({
      product,
      quantity: result ? parseInt(result, 10) : DEFAULTS.quantity,
    });
  }

  return items;
}
