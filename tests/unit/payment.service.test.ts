/**
 * Unit tests for PaymentService
 */

import { PaymentService } from "../../src/services/payment.service";
import { PaymentResult } from "../../src/types/payment.types";

describe("PaymentService", () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
  });

  describe("processPayment", () => {
    describe("successful payments", () => {
      it("should process payment successfully for amount 0", async () => {
        const cardNumber = "4111111111111111";
        const amount = 0;
        const result: PaymentResult = await paymentService.processPayment(
          cardNumber,
          amount,
          "Test Description"
        );

        expect(result.success).toBe(true);
      });

      it("should process payment successfully for small amount", async () => {
        const cardNumber = "4111111111111111";
        const amount = 100; // $1.00
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result.success).toBe(true);
      });

      it("should process payment successfully for normal amount", async () => {
        const cardNumber = "4111111111111111";
        const amount = 5000; // $50.00
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result.success).toBe(true);
      });

      it("should process payment successfully for large amount", async () => {
        const cardNumber = "4111111111111111";
        const amount = 100000; // $1000.00
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result.success).toBe(true);
      });

      it("should process payment successfully for amount 9998", async () => {
        const cardNumber = "4111111111111111";
        const amount = 9998;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result.success).toBe(true);
      });

      it("should process payment successfully for amount 10000", async () => {
        const cardNumber = "4111111111111111";
        const amount = 10000;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result.success).toBe(true);
      });
    });

    describe("payment failures", () => {
      it("should fail payment when amount is 9999 cents", async () => {
        const cardNumber = "4111111111111111";
        const amount = 9999; // Test failure scenario
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result.success).toBe(false);
      });
    });

    describe("various amounts", () => {
      it("should handle various payment amounts correctly", async () => {
        const cardNumber = "4111111111111111";
        const amounts = [1, 50, 100, 500, 1000, 5000, 10000, 50000];

        for (const amount of amounts) {
          const result = await paymentService.processPayment(
            cardNumber,
            amount,
            "Test Description"
          );
          expect(result.success).toBe(true);
        }
      });

      it("should handle negative amounts", async () => {
        const cardNumber = "4111111111111111";
        const amount = -100;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        // Negative amounts should succeed (mock doesn't validate)
        expect(result.success).toBe(true);
      });

      it("should handle decimal-like amounts (rounded to cents)", async () => {
        const cardNumber = "4111111111111111";
        // Note: In real implementation, amounts should be integers (cents)
        // But testing that the service handles what it receives
        const amount = 1234;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result.success).toBe(true);
      });
    });

    describe("card number handling", () => {
      it("should process payment with different card numbers", async () => {
        const cardNumbers = [
          "4111111111111111",
          "5555555555554444",
          "378282246310005",
          "6011111111111117",
        ];
        const amount = 1000;

        for (const cardNumber of cardNumbers) {
          const result = await paymentService.processPayment(
            cardNumber,
            amount,
            "Test Description"
          );
          expect(result.success).toBe(true);
        }
      });

      it("should process payment with empty card number", async () => {
        const cardNumber = "";
        const amount = 1000;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        // Mock doesn't validate card number format
        expect(result.success).toBe(true);
      });

      it("should process payment with invalid card number format", async () => {
        const cardNumber = "1234";
        const amount = 1000;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        // Mock doesn't validate card number format
        expect(result.success).toBe(true);
      });
    });

    describe("result format", () => {
      it("should return PaymentResult with success property", async () => {
        const cardNumber = "4111111111111111";
        const amount = 1000;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result).toHaveProperty("success");
        expect(typeof result.success).toBe("boolean");
      });

      it("should return consistent result format for success", async () => {
        const cardNumber = "4111111111111111";
        const amount = 1000;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result).toEqual({ success: true });
      });

      it("should return consistent result format for failure", async () => {
        const cardNumber = "4111111111111111";
        const amount = 9999;
        const result = await paymentService.processPayment(cardNumber, amount, "Test Description");

        expect(result).toEqual({ success: false });
      });
    });
  });
});