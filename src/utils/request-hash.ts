/**
 * Request canonicalization and hashing utilities for idempotency
 *
 * Purpose: Create a deterministic hash of an order request that:
 * - Excludes sensitive data (paymentDetails)
 * - Is stable regardless of property order
 * - Normalizes item ordering by productId
 */

import { createHash } from "crypto";
import { CreateOrderRequest } from "../middlewares/validation.middleware";

/**
 * Canonicalized order request - excludes sensitive payment data
 */
interface CanonicalizedOrderRequest {
  customer: {
    email: string;
  };
  address: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

/**
 * Canonicalize an order request for hashing
 *
 * - Removes paymentDetails entirely (sensitive data)
 * - Sorts items by productId for deterministic ordering
 * - Normalizes quantities to numbers
 *
 * @param body - The validated order request body
 * @returns Canonicalized request object (no sensitive data)
 */
function canonicalizeOrderRequest(
  body: CreateOrderRequest
): CanonicalizedOrderRequest {
  // Sort items by productId for deterministic ordering
  const sortedItems = [...body.items]
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  return {
    customer: {
      email: body.customer.email,
    },
    address: body.address,
    items: sortedItems,
  };
}

/**
 * Create a SHA-256 hash of a canonicalized request
 *
 * @param canonicalized - The canonicalized request object
 * @returns Hex-encoded SHA-256 hash
 */
function hashRequest(canonicalized: CanonicalizedOrderRequest): string {
  const json = JSON.stringify(canonicalized);
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Convenience function to canonicalize and hash in one step
 *
 * @param body - The validated order request body
 * @returns Hex-encoded SHA-256 hash of the canonicalized request
 */
export function computeRequestHash(body: CreateOrderRequest): string {
  const canonicalized = canonicalizeOrderRequest(body);
  return hashRequest(canonicalized);
}
