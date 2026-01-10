/**
 * Types for idempotency middleware
 */

import { IdempotencyStatus } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

/**
 * Idempotency record stored in the database
 * Matches the Prisma IdempotencyKey model
 */
export interface IdempotencyRecord {
  id: string;
  customerKey: string;
  key: string;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatus: number | null;
  responseBody: JsonValue | null;
  lockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Context attached to the request for idempotency tracking
 * Used by the controller to update idempotency state after processing
 */
export interface IdempotencyContext {
  id: string;
  customerKey: string;
  key: string;
}

/**
 * Stale lock threshold in milliseconds (30 seconds)
 * If a PROCESSING record's lockedAt is older than this, it can be taken over
 */
export const STALE_LOCK_THRESHOLD_MS = 30_000;
