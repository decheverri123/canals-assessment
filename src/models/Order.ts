import { Address } from './Address';
import { OrderItem } from './OrderItem';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string;
  customerId: string;
  shippingAddress: Address;
  items: OrderItem[];
  warehouseId: string;
  totalAmount: number;
  paymentConfirmation: string;
  status: OrderStatus;
  createdAt: Date;
}