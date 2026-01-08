/**
 * Payment service interface and types
 */

export interface IPaymentService {
  processPayment(cardNumber: string, amount: number): Promise<PaymentResult>;
}

export interface PaymentResult {
  success: boolean;
}
