import * as fc from 'fast-check';
import { Address } from './Address';

describe('Address Model Properties', () => {
  it('should handle address objects correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          street: fc.string({ minLength: 1 }),
          city: fc.string({ minLength: 1 }),
          state: fc.string({ minLength: 1 }),
          zipCode: fc.string({ minLength: 1 }),
          country: fc.string({ minLength: 1 }),
          latitude: fc.option(fc.float({ min: -90, max: 90 }), { nil: undefined }),
          longitude: fc.option(fc.float({ min: -180, max: 180 }), { nil: undefined })
        }),
        (address: Address) => {
          // Property: All required fields should be present and non-empty
          expect(address.street).toBeTruthy();
          expect(address.city).toBeTruthy();
          expect(address.state).toBeTruthy();
          expect(address.zipCode).toBeTruthy();
          expect(address.country).toBeTruthy();
          
          // Property: Optional coordinates should be within valid ranges if present
          if (address.latitude !== undefined && address.latitude !== null) {
            expect(address.latitude).toBeGreaterThanOrEqual(-90);
            expect(address.latitude).toBeLessThanOrEqual(90);
          }
          
          if (address.longitude !== undefined && address.longitude !== null) {
            expect(address.longitude).toBeGreaterThanOrEqual(-180);
            expect(address.longitude).toBeLessThanOrEqual(180);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});