/**
 * Customer information prompts
 * Email and shipping address inputs with defaults
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { DEFAULTS } from '../config/defaults';

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Customer info collected from prompts
 */
export interface CustomerInfo {
  email: string;
  address: string;
}

/**
 * Prompt for customer email
 */
export async function promptEmail(): Promise<string> {
  const email = await p.text({
    message: `Customer email ${pc.dim(`(${DEFAULTS.email})`)}`,
    placeholder: 'Press Enter for default',
    validate: (value) => {
      const emailToValidate = value.trim() || DEFAULTS.email;
      if (!isValidEmail(emailToValidate)) {
        return 'Please enter a valid email address';
      }
      return undefined;
    },
  });

  if (p.isCancel(email)) {
    p.cancel('Order cancelled.');
    process.exit(0);
  }

  const result = (email as string | undefined)?.trim();
  return result || DEFAULTS.email;
}

/**
 * Prompt for shipping address
 */
export async function promptAddress(): Promise<string> {
  const address = await p.text({
    message: `Shipping address ${pc.dim(`(${DEFAULTS.address})`)}`,
    placeholder: 'Press Enter for default',
  });

  if (p.isCancel(address)) {
    p.cancel('Order cancelled.');
    process.exit(0);
  }

  const result = (address as string | undefined)?.trim();
  return result || DEFAULTS.address;
}

/**
 * Prompt for all customer information
 */
export async function promptCustomerInfo(): Promise<CustomerInfo> {
  const address = await promptAddress();
  const email = await promptEmail();

  return { email, address };
}
