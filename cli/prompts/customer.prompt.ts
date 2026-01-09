/**
 * Customer information prompts
 * Email and shipping address inputs with defaults
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { DEFAULTS } from "../config/defaults";

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
    placeholder: "Press Enter for default",
    validate: (value) => {
      const emailToValidate = value.trim() || DEFAULTS.email;
      if (!isValidEmail(emailToValidate)) {
        return "Please enter a valid email address";
      }
      return undefined;
    },
  });

  if (p.isCancel(email)) {
    p.cancel("Order cancelled.");
    process.exit(0);
  }

  const result = (email as string | undefined)?.trim();
  return result || DEFAULTS.email;
}

/**
 * Pre-defined addresses that map to different warehouses
 */
const PREDEFINED_ADDRESSES = [
  {
    label: "456 Sunset Blvd, Los Angeles, CA 90028",
    value: "456 Sunset Blvd, Los Angeles, CA 90028",
  }, // West Coast Warehouse
  {
    label: "789 Michigan Ave, Chicago, IL 60611",
    value: "789 Michigan Ave, Chicago, IL 60611",
  }, // Central Warehouse
  {
    label: "321 State St, Albany, NY 12207",
    value: "321 State St, Albany, NY 12207",
  }, // East Coast Warehouse (closer to NYC)
] as const;

/**
 * Prompt for shipping address with pre-defined options
 */
export async function promptAddress(): Promise<string> {
  const addressChoice = await p.select({
    message: "Shipping address",
    options: PREDEFINED_ADDRESSES.map((addr) => ({
      label: addr.label,
      value: addr.value,
    })),
    initialValue: PREDEFINED_ADDRESSES[0].value,
  });

  if (p.isCancel(addressChoice)) {
    p.cancel("Order cancelled.");
    process.exit(0);
  }

  return addressChoice as string;
}

/**
 * Prompt for all customer information
 */
export async function promptCustomerInfo(): Promise<CustomerInfo> {
  const address = await promptAddress();
  const email = await promptEmail();

  return { email, address };
}
