/**
 * API service for CLI interactions
 * Handles fetching products and submitting orders
 */

import { DEFAULTS } from '../config/defaults';
import type { Product, OrderRequest, OrderResponse, ApiError } from '../types/cli.types';

/**
 * Result containing both parsed response and raw data
 */
export interface SubmitOrderResult {
  response: OrderResponse;
  rawResponse: string;
  curlCommand: string;
}

/**
 * Generate curl command for order request
 */
export function generateCurlCommand(orderData: OrderRequest): string {
  const jsonBody = JSON.stringify(orderData);
  // Escape for shell
  const escapedBody = jsonBody.replace(/'/g, "'\\''");
  
  return `curl -X POST ${DEFAULTS.apiUrl}/orders \\
  -H "Content-Type: application/json" \\
  -d '${escapedBody}'`;
}

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
 * Returns both the parsed response and raw JSON for display
 */
export async function submitOrder(orderData: OrderRequest): Promise<SubmitOrderResult> {
  const curlCommand = generateCurlCommand(orderData);
  
  const response = await fetch(`${DEFAULTS.apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  const rawText = await response.text();
  let data: OrderResponse | ApiError;
  
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Invalid JSON response: ${rawText}`);
  }

  if (!response.ok) {
    const error = data as ApiError;
    const message = error.details
      ? error.details.map((d) => `${d.path}: ${d.message}`).join(', ')
      : error.error;
    throw new Error(message || `Order failed: ${response.status}`);
  }

  return {
    response: data as OrderResponse,
    rawResponse: JSON.stringify(data, null, 2),
    curlCommand,
  };
}
