import { OrderStatus } from './Order';

describe('Order Model', () => {
  it('should have correct OrderStatus enum values', () => {
    expect(OrderStatus.PENDING).toBe('PENDING');
    expect(OrderStatus.CONFIRMED).toBe('CONFIRMED');
    expect(OrderStatus.PROCESSING).toBe('PROCESSING');
    expect(OrderStatus.SHIPPED).toBe('SHIPPED');
    expect(OrderStatus.DELIVERED).toBe('DELIVERED');
    expect(OrderStatus.CANCELLED).toBe('CANCELLED');
  });
});