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
  async processPayment(
    cardNumber: string,
    amount: number,
    _description: string
  ): Promise<PaymentResult> {
    // Basic card number validation
    const cleanCard = cardNumber.replace(/\s|-/g, '');
    if (!/^\d{16,19}$/.test(cleanCard)) {
      return { 
        success: false,
        error: 'INVALID_CARD'
      };
    }
    
    // Test failure scenario
    if (amount === PaymentService.TEST_FAILURE_AMOUNT) {
      return { 
        success: false,
        error: 'CARD_DECLINED'
      };
    }
    
    return { success: true };
  }
}
