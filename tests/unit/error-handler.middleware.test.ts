/**
 * Unit tests for error handler middleware
 */

import { Request, Response, NextFunction } from "express";
import {
  errorHandler,
  BusinessError,
  SplitShipmentError,
  asyncHandler,
} from "../../src/middlewares/error-handler.middleware";
import { z } from "zod";

describe("errorHandler middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: jest.Mock;
  let jsonSpy: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    statusSpy = jest.fn().mockReturnThis();
    jsonSpy = jest.fn().mockReturnThis();

    mockRequest = {};

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
      headersSent: false,
    };

    mockNext = jest.fn();

    // Reset NODE_ENV to test
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe("BusinessError handling", () => {
    it("should handle BusinessError with default status code 400", () => {
      const error = new BusinessError("Business logic error");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Business logic error",
        code: undefined,
        stack: error.stack,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle BusinessError with custom status code", () => {
      const error = new BusinessError("Not found", 404);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Not found",
        code: undefined,
        stack: error.stack,
      });
    });

    it("should handle BusinessError with custom code", () => {
      const error = new BusinessError("Invalid input", 400, "INVALID_INPUT");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Invalid input",
        code: "INVALID_INPUT",
        stack: error.stack,
      });
    });

    it("should not include stack trace in production mode", () => {
      process.env.NODE_ENV = "production";
      const error = new BusinessError("Business error", 400, "ERROR_CODE");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Business error",
        code: "ERROR_CODE",
      });
      expect(jsonSpy.mock.calls[0][0]).not.toHaveProperty("stack");
    });
  });

  describe("SplitShipmentError handling", () => {
    it("should handle SplitShipmentError with default message", () => {
      const error = new SplitShipmentError();

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Split shipment not supported",
        code: "SPLIT_SHIPMENT_NOT_SUPPORTED",
        stack: error.stack,
      });
    });

    it("should handle SplitShipmentError with custom message", () => {
      const error = new SplitShipmentError("Custom split shipment error");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Custom split shipment error",
        code: "SPLIT_SHIPMENT_NOT_SUPPORTED",
        stack: error.stack,
      });
    });

    it("should have correct error code for SplitShipmentError", () => {
      const error = new SplitShipmentError();
      expect(error.code).toBe("SPLIT_SHIPMENT_NOT_SUPPORTED");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("ZodError handling", () => {
    it("should handle ZodError with validation details", () => {
      const schema = z.object({
        email: z.string().email(),
      });
      let zodError: z.ZodError;
      try {
        schema.parse({ email: "invalid" });
      } catch (error) {
        zodError = error as z.ZodError;
      }

      errorHandler(
        zodError!,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: zodError!.errors,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should not include details in production mode for ZodError", () => {
      process.env.NODE_ENV = "production";
      const schema = z.object({
        email: z.string().email(),
      });
      let zodError: z.ZodError;
      try {
        schema.parse({ email: "invalid" });
      } catch (error) {
        zodError = error as z.ZodError;
      }

      errorHandler(
        zodError!,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
      });
      expect(jsonSpy.mock.calls[0][0]).not.toHaveProperty("details");
    });
  });

  describe("Prisma errors", () => {
    it("should handle Prisma P2002 error (unique constraint violation)", () => {
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        meta: {
          target: ["email"],
        },
        message: "Unique constraint failed",
      };

      errorHandler(
        prismaError as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Resource already exists",
        code: "P2002",
        meta: prismaError.meta,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle Prisma P2025 error (record not found)", () => {
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2025",
        message: "Record not found",
      };

      errorHandler(
        prismaError as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Resource not found",
        code: "P2025",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should not include code and meta in production for P2002", () => {
      process.env.NODE_ENV = "production";
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        meta: {
          target: ["email"],
        },
        message: "Unique constraint failed",
      };

      errorHandler(
        prismaError as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Resource already exists",
      });
      expect(jsonSpy.mock.calls[0][0]).not.toHaveProperty("code");
      expect(jsonSpy.mock.calls[0][0]).not.toHaveProperty("meta");
    });

    it("should not include code in production for P2025", () => {
      process.env.NODE_ENV = "production";
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2025",
        message: "Record not found",
      };

      errorHandler(
        prismaError as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Resource not found",
      });
      expect(jsonSpy.mock.calls[0][0]).not.toHaveProperty("code");
    });

    it("should handle other Prisma error codes with default handler", () => {
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2003",
        message: "Foreign key constraint failed",
      };

      errorHandler(
        prismaError as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should fall through to default error handler
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Foreign key constraint failed",
        stack: undefined,
        name: "PrismaClientKnownRequestError",
      });
    });
  });

  describe("generic error handling", () => {
    it("should handle generic Error with default status code 500", () => {
      const error = new Error("Generic error message");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Generic error message",
        stack: error.stack,
        name: "Error",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle error with custom statusCode property", () => {
      const error = new Error("Custom status error") as any;
      error.statusCode = 403;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Custom status error",
        stack: error.stack,
        name: "Error",
      });
    });

    it("should show generic message in production for unknown errors", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("Internal server error details");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Internal server error",
      });
      expect(jsonSpy.mock.calls[0][0]).not.toHaveProperty("stack");
      expect(jsonSpy.mock.calls[0][0]).not.toHaveProperty("name");
    });

    it("should handle error without message", () => {
      const error = new Error();

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalled();
    });
  });

  describe("response already sent", () => {
    it("should delegate to next() when response headers already sent", () => {
      mockResponse.headersSent = true;
      const error = new Error("Error after response sent");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it("should not send response when headers already sent for BusinessError", () => {
      mockResponse.headersSent = true;
      const error = new BusinessError("Business error");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe("error response format", () => {
    it("should return consistent error format for BusinessError", () => {
      const error = new BusinessError("Test error", 400, "TEST_CODE");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonSpy.mock.calls[0][0];
      expect(response).toHaveProperty("error");
      expect(response).toHaveProperty("code");
      expect(typeof response.error).toBe("string");
      expect(typeof response.code).toBe("string");
    });

    it("should return consistent error format for generic errors", () => {
      const error = new Error("Test error");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonSpy.mock.calls[0][0];
      expect(response).toHaveProperty("error");
      expect(typeof response.error).toBe("string");
    });
  });
});

describe("asyncHandler wrapper", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  it("should call the handler function with correct arguments", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);

    const wrappedHandler = asyncHandler(handler);
    await wrappedHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(handler).toHaveBeenCalledWith(
      mockRequest,
      mockResponse,
      mockNext
    );
  });

  it("should catch and forward errors from async handler", async () => {
    const error = new Error("Async error");
    const handler = jest.fn().mockRejectedValue(error);

    const wrappedHandler = asyncHandler(handler);
    await wrappedHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it("should catch and forward BusinessError from async handler", async () => {
    const error = new BusinessError("Business error", 400);
    const handler = jest.fn().mockRejectedValue(error);

    const wrappedHandler = asyncHandler(handler);
    await wrappedHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it("should handle successful async handler without errors", async () => {
    const handler = jest.fn().mockResolvedValue({ success: true });

    const wrappedHandler = asyncHandler(handler);
    await wrappedHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle handler that returns rejected promise", async () => {
    const error = new Error("Handler error");
    const handler = jest.fn().mockRejectedValue(error);

    const wrappedHandler = asyncHandler(handler);
    await wrappedHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
