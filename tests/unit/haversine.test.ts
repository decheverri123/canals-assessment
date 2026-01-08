/**
 * Unit tests for haversine distance calculation utility
 */

import { calculateHaversineDistance } from "../../src/utils/haversine";

describe("calculateHaversineDistance", () => {
  describe("should calculate distance correctly", () => {
    it("should return 0 for same coordinates", () => {
      const lat = 40.7128;
      const lng = -74.006;
      const distance = calculateHaversineDistance(lat, lng, lat, lng);
      expect(distance).toBe(0);
    });

    it("should calculate distance between NYC coordinates correctly", () => {
      // NYC coordinates
      const nycLat = 40.7128;
      const nycLng = -74.006;

      // Philadelphia coordinates (approximately 130 km from NYC)
      const phillyLat = 39.9526;
      const phillyLng = -75.1652;

      const distance = calculateHaversineDistance(
        nycLat,
        nycLng,
        phillyLat,
        phillyLng
      );

      // Should be approximately 120-140 km
      expect(distance).toBeGreaterThan(120);
      expect(distance).toBeLessThan(140);
    });

    it("should calculate distance between known coordinates", () => {
      // London coordinates
      const londonLat = 51.5074;
      const londonLng = -0.1278;

      // Paris coordinates (approximately 344 km from London)
      const parisLat = 48.8566;
      const parisLng = 2.3522;

      const distance = calculateHaversineDistance(
        londonLat,
        londonLng,
        parisLat,
        parisLng
      );

      // Should be approximately 340-350 km
      expect(distance).toBeGreaterThan(330);
      expect(distance).toBeLessThan(360);
    });

    it("should return same distance regardless of order", () => {
      const lat1 = 40.7128;
      const lng1 = -74.006;
      const lat2 = 34.0522;
      const lng2 = -118.2437;

      const distance1 = calculateHaversineDistance(lat1, lng1, lat2, lng2);
      const distance2 = calculateHaversineDistance(lat2, lng2, lat1, lng1);

      expect(distance1).toBe(distance2);
    });
  });

  describe("should handle edge cases", () => {
    it("should handle coordinates on opposite sides of the globe", () => {
      // New York
      const nycLat = 40.7128;
      const nycLng = -74.006;

      // Point approximately opposite on the globe (in the Indian Ocean)
      const oppositeLat = -40.7128;
      const oppositeLng = 105.994; // 180 - (-74.006) adjusted

      const distance = calculateHaversineDistance(
        nycLat,
        nycLng,
        oppositeLat,
        oppositeLng
      );

      // Should be approximately half the Earth's circumference (~20,000 km)
      expect(distance).toBeGreaterThan(18000);
      expect(distance).toBeLessThan(20040);
    });

    it("should handle coordinates at the equator", () => {
      // Point on equator at 0° longitude
      const lat1 = 0;
      const lng1 = 0;

      // Point on equator at 90° longitude
      const lat2 = 0;
      const lng2 = 90;

      const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

      // Should be approximately 1/4 of Earth's circumference (~10,000 km)
      expect(distance).toBeGreaterThan(9500);
      expect(distance).toBeLessThan(10020);
    });

    it("should handle coordinates at the poles", () => {
      // North Pole
      const northLat = 90;
      const northLng = 0;

      // South Pole
      const southLat = -90;
      const southLng = 0;

      const distance = calculateHaversineDistance(
        northLat,
        northLng,
        southLat,
        southLng
      );

      // Should be approximately half the Earth's circumference (~20,000 km)
      expect(distance).toBeGreaterThan(19900);
      expect(distance).toBeLessThan(20040);
    });

    it("should handle very small distances", () => {
      // Two points very close together (about 1 km apart)
      const lat1 = 40.7128;
      const lng1 = -74.006;
      const lat2 = 40.7128 + 0.009; // Approximately 1 km north
      const lng2 = -74.006;

      const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

      // Should be approximately 1 km
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });
  });

  describe("should handle invalid inputs gracefully", () => {
    it("should handle negative latitudes", () => {
      const lat1 = -40.7128;
      const lng1 = -74.006;
      const lat2 = -34.0522;
      const lng2 = -118.2437;

      const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

      // Should still calculate a valid distance
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe("number");
      expect(isNaN(distance)).toBe(false);
    });

    it("should handle longitudes greater than 180", () => {
      // Longitude wrapped around (e.g., 200° = -160°)
      const lat1 = 40.7128;
      const lng1 = 200; // Equivalent to -160
      const lat2 = 40.7128;
      const lng2 = -160;

      // These should be treated as the same point for distance calculation
      // (though mathematically they're different, the formula handles it)
      const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

      // Should calculate a distance (may not be 0 due to how the formula works)
      expect(typeof distance).toBe("number");
      expect(isNaN(distance)).toBe(false);
    });

    it("should handle zero coordinates", () => {
      const distance = calculateHaversineDistance(0, 0, 0, 0);
      expect(distance).toBe(0);
    });
  });

  describe("should maintain accuracy", () => {
    it("should calculate distance with reasonable precision", () => {
      // Known distance: NYC to Boston is approximately 306 km
      const nycLat = 40.7128;
      const nycLng = -74.006;
      const bostonLat = 42.3601;
      const bostonLng = -71.0589;

      const distance = calculateHaversineDistance(
        nycLat,
        nycLng,
        bostonLat,
        bostonLng
      );

      // Should be within 10% of actual distance
      expect(distance).toBeGreaterThan(275);
      expect(distance).toBeLessThan(337);
    });

    it("should handle high precision coordinates", () => {
      // Very precise coordinates
      const lat1 = 40.712776;
      const lng1 = -74.005941;
      const lat2 = 40.758896;
      const lng2 = -73.98513;

      const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

      // Should return a valid number
      expect(typeof distance).toBe("number");
      expect(isNaN(distance)).toBe(false);
      expect(distance).toBeGreaterThan(0);
    });
  });
});
