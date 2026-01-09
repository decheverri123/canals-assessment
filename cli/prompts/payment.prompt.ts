/**
 * Payment information prompts
 * Credit card input with default
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { DEFAULTS } from '../config/defaults';

/**
 * Payment info collected from prompt
 */
export interface PaymentInfo {
  creditCard: string;
}

/**
 * Mask credit card number for display (show last 4 digits)
 */
export function maskCreditCard(cardNumber: string): string {
  if (cardNumber.length < 4) return cardNumber;
  const lastFour = cardNumber.slice(-4);
  const masked = '*'.repeat(cardNumber.length - 4);
  return `${masked}${lastFour}`;
}

/**
 * Validate credit card number (basic length check)
 */
function isValidCreditCard(card: string): boolean {
  const digitsOnly = card.replace(/\s|-/g, '');
  return digitsOnly.length >= 16 && digitsOnly.length <= 19 && /^\d+$/.test(digitsOnly);
}

/**
 * Prompt for credit card number
 */
export async function promptCreditCard(): Promise<string> {
  const maskedDefault = maskCreditCard(DEFAULTS.creditCard);
  
  const creditCard = await p.text({
    message: `Credit card number ${pc.dim(`(${maskedDefault})`)}`,
    placeholder: 'Press Enter for default',
    validate: (value) => {
      const cardToValidate = value.trim() || DEFAULTS.creditCard;
      if (!isValidCreditCard(cardToValidate)) {
        return 'Please enter a valid credit card number (16-19 digits)';
      }
      return undefined;
    },
  });

  if (p.isCancel(creditCard)) {
    p.cancel('Order cancelled.');
    process.exit(0);
  }

  // Use default if empty, otherwise clean the input
  const result = (creditCard as string | undefined)?.trim();
  return result ? result.replace(/\s|-/g, '') : DEFAULTS.creditCard;
}

/**
 * Prompt for all payment information
 */
export async function promptPaymentInfo(): Promise<PaymentInfo> {
  const creditCard = await promptCreditCard();
  return { creditCard };
}
