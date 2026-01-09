/**
 * Unit tests for GeocodingService
 */

import { GeocodingService } from "../../src/services/geocoding.service";
import { GeocodeResult } from "../../src/types/geocoding.types";

describe("GeocodingService", () => {
  let geocodingService: GeocodingService;

  beforeEach(() => {
    geocodingService = new GeocodingService();
  });

  describe("geocode", () => {
    it("should return NYC coordinates for any address", async () => {
      const address = "123 Main St, New York, NY 10001";
      const result: GeocodeResult = await geocodingService.geocode(address);

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        lat: 40.7128,
        lng: -74.0060,
      });
    });

    it("should return NYC coordinates for different addresses", async () => {
      const address1 = "456 Broadway, Los Angeles, CA 90001";
      const address2 = "789 Market St, San Francisco, CA 94102";

      const result1 = await geocodingService.geocode(address1);
      const result2 = await geocodingService.geocode(address2);

      // Both should return NYC coordinates (mock behavior)
      expect(result1.latitude).toBe(40.7128);
      expect(result1.longitude).toBe(-74.0060);
      expect(result2.latitude).toBe(40.7128);
      expect(result2.longitude).toBe(-74.0060);
    });

    it("should return coordinates with both latitude/longitude and deprecated lat/lng properties", async () => {
      const address = "Test Address";
      const result = await geocodingService.geocode(address);

      // Should have both new and deprecated properties for backward compatibility
      expect(result).toHaveProperty("latitude");
      expect(result).toHaveProperty("longitude");
      expect(result).toHaveProperty("lat");
      expect(result).toHaveProperty("lng");

      // Values should match
      expect(result.latitude).toBe(result.lat);
      expect(result.longitude).toBe(result.lng);
    });

    it("should handle empty address string", async () => {
      const address = "";
      const result = await geocodingService.geocode(address);

      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });

    it("should handle special characters in address", async () => {
      const address = "123 Main St, Apt #4B, New York, NY 10001";
      const result = await geocodingService.geocode(address);

      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });

    it("should return consistent results for the same address", async () => {
      const address = "123 Test St";
      const result1 = await geocodingService.geocode(address);
      const result2 = await geocodingService.geocode(address);

      expect(result1).toEqual(result2);
    });

    it("should return valid coordinate values", async () => {
      const address = "Any address";
      const result = await geocodingService.geocode(address);

      // Latitude should be between -90 and 90
      expect(result.latitude).toBeGreaterThanOrEqual(-90);
      expect(result.latitude).toBeLessThanOrEqual(90);

      // Longitude should be between -180 and 180
      expect(result.longitude).toBeGreaterThanOrEqual(-180);
      expect(result.longitude).toBeLessThanOrEqual(180);

      // Should be numbers
      expect(typeof result.latitude).toBe("number");
      expect(typeof result.longitude).toBe("number");
      expect(typeof result.lat).toBe("number");
      expect(typeof result.lng).toBe("number");
    });
  });
});
