/**
 * Types for idempotency middleware
 */

import { JsonValue } from "@prisma/client/runtime/library";

/**
 * Idempotency record stored in the database
 */
export interface IdempotencyRecord {
  key: string;
  responseStatus: number | null;
  responseBody: JsonValue | null;
  requestParams: JsonValue;
  createdAt: Date;
  lockedAt: Date;
}

/**
 * Result of checking an idempotency key
 * Discriminated union for the three possible states
 */
export type IdempotencyCheckResult =
  | { status: "new"; record: IdempotencyRecord }
  | { status: "completed"; record: IdempotencyRecord }
  | { status: "in_flight"; record: IdempotencyRecord };
