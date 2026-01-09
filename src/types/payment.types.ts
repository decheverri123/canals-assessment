/**
 * Payment service interface and types
 */

export interface IPaymentService {
  processPayment(
    cardNumber: string,
    amount: number,
    description: string
  ): Promise<PaymentResult>;

  refundPayment(
    transactionId: string,
    amount: number,
    reason: string
  ): Promise<PaymentResult>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}
