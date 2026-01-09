/**
 * CLI-specific types for the order submission tool
 */

/**
 * Product from API response
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number; // in cents
}

/**
 * Order item with product and quantity
 */
export interface OrderItem {
  product: Product;
  quantity: number;
}

/**
 * Order request payload for POST /orders
 */
export interface OrderRequest {
  customer: {
    email: string;
  };
  address: string;
  paymentDetails: {
    creditCard: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

/**
 * Warehouse info in order response
 */
export interface WarehouseResponse {
  id: string;
  name: string;
  address: string;
}

/**
 * Order item in response
 */
export interface OrderItemResponse {
  id: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
}

/**
 * Order response from POST /orders
 */
export interface OrderResponse {
  id: string;
  customerEmail: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  warehouse: WarehouseResponse;
  orderItems: OrderItemResponse[];
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  code?: string;
  details?: Array<{
    path: string;
    message: string;
  }>;
}
