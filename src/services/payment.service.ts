import { IPaymentService, PaymentResult } from '../types/payment.types';

/**
 * Mock payment service implementation
 * Returns success unless amount is 9999 cents (test failure scenario)
 */
export class PaymentService implements IPaymentService {
  // Test failure amount - used in tests to simulate payment failures
  public static readonly TEST_FAILURE_AMOUNT = 9999;

  /**
   * Process a payment
   * @param cardNumber The credit card number
   * @param amount The amount in cents
   * @param _description Description of the payment (e.g. Order ID)
   * @returns Promise resolving to payment result
   */
  async processPayment(_cardNumber: string, amount: number, _description: string): Promise<PaymentResult> {
    // Mock implementation: return failure if amount is 9999 cents (test scenario)
    // In a real implementation, this would call a payment gateway API
    if (amount === 9999) {
      return {
        success: false,
      };
    }

    return {
      success: true,
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Refund a payment
   * @param transactionId The transaction ID to refund
   * @param _amount The amount to refund
   * @param _reason Reason for refund
   * @returns Promise resolving to refund result
   */
  async refundPayment(transactionId: string, _amount: number, _reason: string): Promise<PaymentResult> {
    console.log(`Processing refund for transaction ${transactionId}`);
    return {
      success: true,
      transactionId: `ref_${transactionId}`,
    };
  }
}
