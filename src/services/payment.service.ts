import { IPaymentService, PaymentResult } from '../types/payment.types';

/**
 * Mock payment service implementation
 * Returns success unless amount is 9999 cents (test failure scenario)
 */
export class PaymentService implements IPaymentService {
  /**
   * Process a payment
   * @param _cardNumber The credit card number
   * @param amount The amount in cents
   * @returns Promise resolving to payment result
   */
  async processPayment(_cardNumber: string, amount: number): Promise<PaymentResult> {
    // Mock implementation: return failure if amount is 9999 cents (test scenario)
    // In a real implementation, this would call a payment gateway API
    if (amount === 9999) {
      return {
        success: false,
      };
    }

    return {
      success: true,
    };
  }
}
