/**
 * Idempotency middleware for preventing duplicate order creation
 * Uses Idempotency-Key header pattern backed by PostgreSQL
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { IdempotencyCheckResult } from "../types/idempotency.types";
import { Prisma } from "@prisma/client";

/**
 * Header name for idempotency key (case-insensitive in Express)
 */
const IDEMPOTENCY_HEADER = "idempotency-key";

/**
 * Check existing idempotency key and determine its state
 */
async function checkIdempotencyKey(
  key: string,
  requestParams: unknown
): Promise<IdempotencyCheckResult> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key },
  });

  if (!existing) {
    // Create new record with lock
    const record = await prisma.idempotencyKey.create({
      data: {
        key,
        requestParams: requestParams as Prisma.InputJsonValue,
        createdAt: new Date(),
        lockedAt: new Date(),
      },
    });
    return { status: "new", record };
  }

  // Check if response has been stored (completed)
  if (existing.responseStatus !== null) {
    return { status: "completed", record: existing };
  }

  // No response yet - request is in-flight
  return { status: "in_flight", record: existing };
}

/**
 * Stable JSON stringify that sorts keys for consistent comparison
 */
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, key) => {
          sorted[key] = value[key];
          return sorted;
        }, {});
    }
    return value;
  });
}

/**
 * Compare request params to detect key reuse with different payload
 */
function paramsMatch(stored: unknown, current: unknown): boolean {
  return stableStringify(stored) === stableStringify(current);
}

/**
 * Idempotency middleware
 * - If Idempotency-Key header is missing, proceeds normally
 * - If key exists with response, returns cached response
 * - If key exists without response (in-flight), returns 409 Conflict
 * - If key is new, creates record and intercepts response to store it
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

  try {
    const result = await checkIdempotencyKey(idempotencyKey, req.body);

    switch (result.status) {
      case "completed": {
        // Validate request params match
        if (!paramsMatch(result.record.requestParams, req.body)) {
          res.status(422).json({
            error: "Idempotency key reused with different request parameters",
            code: "IDEMPOTENCY_PARAMS_MISMATCH",
          });
          return;
        }

        // Return cached response
        res
          .status(result.record.responseStatus as number)
          .json(result.record.responseBody);
        return;
      }

      case "in_flight": {
        // Request is already being processed
        res.status(409).json({
          error: "A request with this idempotency key is already in progress",
          code: "IDEMPOTENCY_IN_FLIGHT",
        });
        return;
      }

      case "new": {
        // Intercept res.json to capture and store the response
        const originalJson = res.json.bind(res);

        res.json = function (body: unknown): Response {
          // Store the response in the database (fire-and-forget for performance)
          // The response is sent immediately while DB update happens in background
          prisma.idempotencyKey
            .update({
              where: { key: idempotencyKey },
              data: {
                responseStatus: res.statusCode,
                responseBody: body as Prisma.InputJsonValue,
              },
            })
            .catch((err: Error) => {
              console.error("Failed to update idempotency record:", err);
            });

          // Call original json method
          return originalJson(body);
        };

        next();
        return;
      }
    }
  } catch (error) {
    // Handle race condition - unique constraint violation means another request created the key
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: "A request with this idempotency key is already in progress",
        code: "IDEMPOTENCY_IN_FLIGHT",
      });
      return;
    }

    // Re-throw unexpected errors
    next(error);
  }
};
