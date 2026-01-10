/**
 * Idempotency middleware for preventing duplicate order creation
 * Uses Idempotency-Key header pattern backed by PostgreSQL
 *
 * Key improvements over naive implementation:
 * - Customer-scoped keys (same key for different customers is allowed)
 * - Request hash comparison (detects payload changes without storing sensitive data)
 * - Stale-lock mechanism (allows retry after 30s if request gets stuck)
 * - No res.json monkeypatching (explicit state updates in controller)
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { IdempotencyContext, STALE_LOCK_THRESHOLD_MS } from "../types/idempotency.types";
import { IdempotencyStatus, Prisma } from "@prisma/client";
import { computeRequestHash } from "../utils/request-hash";
import { CreateOrderRequest } from "./validation.middleware";

/**
 * Header name for idempotency key (case-insensitive in Express)
 */
const IDEMPOTENCY_HEADER = "idempotency-key";

/**
 * Extend Express Request to include idempotency context
 */
declare global {
  namespace Express {
    interface Request {
      idempotency?: IdempotencyContext;
    }
  }
}

/**
 * Check if a lock is stale (older than threshold)
 */
function isLockStale(lockedAt: Date): boolean {
  const now = Date.now();
  const lockAge = now - lockedAt.getTime();
  return lockAge > STALE_LOCK_THRESHOLD_MS;
}

/**
 * Idempotency middleware
 *
 * Behavior:
 * - If no Idempotency-Key header: pass through (no idempotency)
 * - If key exists and COMPLETED/FAILED: return cached response
 * - If key exists and PROCESSING:
 *   - If stale (>30s): takeover and reprocess
 *   - If fresh: return 409 Conflict
 * - If key is new: insert PROCESSING row, attach context to req
 *
 * The controller is responsible for updating the idempotency state
 * to COMPLETED or FAILED after processing.
 */
export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idempotencyKey = req.headers[IDEMPOTENCY_HEADER] as string | undefined;

  // No idempotency key provided - proceed normally
  if (!idempotencyKey) {
    next();
    return;
  }

  // Extract customer email for scoping (validation has already run at this point)
  const body = req.body as CreateOrderRequest;
  const customerKey = body.customer.email;
  const requestHash = computeRequestHash(body);

  try {
    // Try to insert a new PROCESSING record
    const record = await prisma.idempotencyKey.create({
      data: {
        customerKey,
        key: idempotencyKey,
        requestHash,
        status: IdempotencyStatus.PROCESSING,
        lockedAt: new Date(),
      },
    });

    // New record created - attach context for controller
    req.idempotency = {
      id: record.id,
      customerKey: record.customerKey,
      key: record.key,
    };

    next();
    return;
  } catch (error) {
    // Handle unique constraint violation (key already exists for this customer)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await handleExistingKey(
        res,
        next,
        req,
        customerKey,
        idempotencyKey,
        requestHash
      );
      return;
    }

    // Re-throw unexpected errors
    next(error);
  }
};

/**
 * Handle an existing idempotency key
 *
 * @param res - Express response
 * @param next - Express next function
 * @param req - Express request (to attach context if takeover)
 * @param customerKey - Customer email
 * @param key - Idempotency key
 * @param requestHash - Hash of current request
 */
async function handleExistingKey(
  res: Response,
  next: NextFunction,
  req: Request,
  customerKey: string,
  key: string,
  requestHash: string
): Promise<void> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      customerKey_key: { customerKey, key },
    },
  });

  // Race condition: record was deleted between insert and lookup
  if (!existing) {
    res.status(409).json({
      error: "A request with this idempotency key is already in progress",
      code: "IDEMPOTENCY_IN_FLIGHT",
    });
    return;
  }

  // Validate request hash matches
  if (existing.requestHash !== requestHash) {
    res.status(422).json({
      error: "Idempotency key reused with different request parameters",
      code: "IDEMPOTENCY_PARAMS_MISMATCH",
    });
    return;
  }

  // Handle based on status
  switch (existing.status) {
    case IdempotencyStatus.COMPLETED:
    case IdempotencyStatus.FAILED: {
      // Return cached response
      res
        .status(existing.responseStatus as number)
        .json(existing.responseBody);
      return;
    }

    case IdempotencyStatus.PROCESSING: {
      // Check if lock is stale
      if (isLockStale(existing.lockedAt)) {
        // Takeover: update lockedAt and proceed with processing
        await prisma.idempotencyKey.update({
          where: { id: existing.id },
          data: { lockedAt: new Date() },
        });

        // Attach context for controller
        req.idempotency = {
          id: existing.id,
          customerKey: existing.customerKey,
          key: existing.key,
        };

        next();
        return;
      }

      // Lock is fresh - return conflict
      res.status(409).json({
        error: "A request with this idempotency key is already in progress",
        code: "IDEMPOTENCY_IN_FLIGHT",
      });
      return;
    }
  }
}
