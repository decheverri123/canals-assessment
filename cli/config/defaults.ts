/**
 * Default values for CLI inputs
 * Users can press Enter to accept these defaults
 */

export const DEFAULTS = {
  /** Default customer email */
  email: "test@example.com",

  /** Default shipping address */
  address: "123 Main St, New York, NY 10001",

  /** Default credit card number (test card) - NEVER use real cards in development */
  creditCard: "4111111111111111",

  /** Default API base URL */
  apiUrl: process.env.API_URL || "http://localhost:3000",

  /** Default quantity for products */
  quantity: 1,
} as const;
