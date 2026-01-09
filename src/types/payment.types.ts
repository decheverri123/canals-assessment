/**
 * Payment service interface and types
 */

export interface IPaymentService {
  processPayment(
    cardNumber: string,
    amount: number,
    description: string
  ): Promise<PaymentResult>;
}

export interface PaymentResult {
  success: boolean;
  error?: string;
}
