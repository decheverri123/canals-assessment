/**
 * Unit tests for validation middleware
 */

import { Request, Response, NextFunction } from "express";
import { validateCreateOrder } from "../../src/middlewares/validation.middleware";

describe("validateCreateOrder middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: jest.Mock;
  let jsonSpy: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    statusSpy = jest.fn().mockReturnThis();
    jsonSpy = jest.fn().mockReturnThis();

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = jest.fn();
  });

  describe("valid order request", () => {
    it("should pass validation and call next() when request is valid", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: "product-123",
            quantity: 2,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St, New York, NY 10001",
        items: [
          {
            productId: "product-123",
            quantity: 2,
          },
        ],
      });
    });

    it("should pass validation with multiple items", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "customer@example.com",
        },
        address: "456 Oak Ave, Los Angeles, CA 90001",
        items: [
          {
            productId: "product-1",
            quantity: 1,
          },
          {
            productId: "product-2",
            quantity: 3,
          },
          {
            productId: "product-3",
            quantity: 5,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe("invalid email format", () => {
    it("should reject request with invalid email format", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "not-an-email",
        },
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "customer.email",
            message: "Invalid email address",
          }),
        ]),
      });
    });

    it("should reject request with missing email", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {},
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "customer.email",
          }),
        ]),
      });
    });

    it("should reject request with email as empty string", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "",
        },
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
    });
  });

  describe("missing required fields", () => {
    it("should reject request with missing customer object", () => {
      mockRequest.body = {
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "customer",
          }),
        ]),
      });
    });

    it("should reject request with missing address", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        items: [
          {
            productId: "product-123",
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "address",
          }),
        ]),
      });
    });

    it("should reject request with missing items array", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "items",
          }),
        ]),
      });
    });
  });

  describe("invalid quantity", () => {
    it("should reject request with negative quantity", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: -1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "items.0.quantity",
            message: "Quantity must be a positive integer",
          }),
        ]),
      });
    });

    it("should reject request with zero quantity", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: 0,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "items.0.quantity",
            message: "Quantity must be a positive integer",
          }),
        ]),
      });
    });

    it("should reject request with non-integer quantity", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: 1.5,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "items.0.quantity",
            message: "Quantity must be an integer",
          }),
        ]),
      });
    });

    it("should reject request with quantity as string", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
        items: [
          {
            productId: "product-123",
            quantity: "2",
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
    });
  });

  describe("empty items array", () => {
    it("should reject request with empty items array", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
        items: [],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "items",
            message: "At least one item is required",
          }),
        ]),
      });
    });
  });

  describe("invalid product ID format", () => {
    it("should reject request with empty product ID", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
        items: [
          {
            productId: "",
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "items.0.productId",
            message: "Product ID is required",
          }),
        ]),
      });
    });

    it("should reject request with missing product ID", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "123 Main St",
        items: [
          {
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "items.0.productId",
          }),
        ]),
      });
    });
  });

  describe("multiple validation errors", () => {
    it("should return all validation errors when multiple fields are invalid", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "invalid-email",
        },
        address: "",
        items: [
          {
            productId: "",
            quantity: -1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      const responseBody = jsonSpy.mock.calls[0][0];
      expect(responseBody.error).toBe("Validation failed");
      expect(responseBody.details.length).toBeGreaterThan(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty request body", () => {
      mockRequest.body = {};

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it("should handle null request body", () => {
      mockRequest.body = null as any;

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it("should handle undefined request body", () => {
      mockRequest.body = undefined as any;

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it("should handle address with only whitespace", () => {
      mockRequest.body = {
        paymentDetails: { creditCard: "4111111111111111" }, customer: {
          email: "test@example.com",
        },
        address: "   ",
        items: [
          {
            productId: "product-123",
            quantity: 1,
          },
        ],
      };

      validateCreateOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Zod's min(1) doesn't trim whitespace, so it passes validation
      // This is expected behavior - the address "   " is technically non-empty
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });
});
