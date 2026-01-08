/**
 * Centralized error handling middleware
 */

import { Request, Response, NextFunction } from 'express';

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
    this.name = 'BusinessError';
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
  constructor(message: string = 'Split shipment not supported') {
    super(message, 400, 'SPLIT_SHIPMENT_NOT_SUPPORTED');
    this.name = 'SplitShipmentError';
  }
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
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
  req: Request,
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
      ...(process.env.NODE_ENV !== 'production' && {
        stack: err.stack,
      }),
    });
    return;
  }

  // Handle Zod validation errors (shouldn't reach here if validation middleware works)
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation failed',
      ...(process.env.NODE_ENV !== 'production' && {
        details: (err as any).errors,
      }),
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    // Handle unique constraint violations
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        error: 'Resource already exists',
        ...(process.env.NODE_ENV !== 'production' && {
          code: prismaError.code,
          meta: prismaError.meta,
        }),
      });
      return;
    }
    // Handle record not found
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        error: 'Resource not found',
        ...(process.env.NODE_ENV !== 'production' && {
          code: prismaError.code,
        }),
      });
      return;
    }
  }

  // Default error handler for unexpected errors
  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
      name: err.name,
    }),
  });
};
