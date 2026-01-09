/**
 * Centralized error handling middleware
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

/**
 * Custom error class for business logic errors
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = "BusinessError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BusinessError);
    }
  }
}

/**
 * Custom error for split shipment scenarios
 */
export class SplitShipmentError extends BusinessError {
  constructor(message: string = "Split shipment not supported") {
    super(message, 400, "SPLIT_SHIPMENT_NOT_SUPPORTED");
    this.name = "SplitShipmentError";
  }
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Centralized error handler middleware
 * Must be the last middleware in the Express app
 */
export const errorHandler = (
  err: Error | BusinessError,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom business errors
  if (err instanceof BusinessError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(process.env.NODE_ENV !== "production" && {
        stack: err.stack,
      }),
    });
    return;
  }

  // Handle Zod validation errors (shouldn't reach here if validation middleware works)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      ...(process.env.NODE_ENV !== "production" && {
        details: err.errors,
      }),
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    // Handle unique constraint violations
    if (err.code === "P2002") {
      res.status(409).json({
        error: "Resource already exists",
        ...(process.env.NODE_ENV !== "production" && {
          code: err.code,
          meta: err.meta,
        }),
      });
      return;
    }
    // Handle record not found
    if (err.code === "P2025") {
      res.status(404).json({
        error: "Resource not found",
        ...(process.env.NODE_ENV !== "production" && {
          code: err.code,
        }),
      });
      return;
    }
  }

  // Default error handler for unexpected errors
  // Check if error has statusCode property (e.g., from Express or custom errors)
  const statusCode = "statusCode" in err && typeof err.statusCode === "number" 
    ? err.statusCode 
    : 500;
  res.status(statusCode).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
      name: err.name,
    }),
  });
};
