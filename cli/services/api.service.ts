/**
 * API service for CLI interactions
 * Handles fetching products and submitting orders
 */

import { DEFAULTS } from '../config/defaults';
import type { Product, OrderRequest, OrderResponse, ApiError } from '../types/cli.types';

/**
 * Fetch all available products from the API
 */
export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${DEFAULTS.apiUrl}/products`);

  if (!response.ok) {
    const error = (await response.json()) as ApiError;
    throw new Error(error.error || `Failed to fetch products: ${response.status}`);
  }

  return response.json() as Promise<Product[]>;
}

/**
 * Submit an order to the API
 */
export async function submitOrder(orderData: OrderRequest): Promise<OrderResponse> {
  const response = await fetch(`${DEFAULTS.apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as ApiError;
    const message = error.details
      ? error.details.map((d) => `${d.path}: ${d.message}`).join(', ')
      : error.error;
    throw new Error(message || `Order failed: ${response.status}`);
  }

  return data as OrderResponse;
}
