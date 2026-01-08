/**
 * Unit tests for haversine distance calculation utility
 */

import { calculateHaversineDistance } from "../../src/utils/haversine";
import { Coordinates } from "../../src/types/coordinates.types";

describe("calculateHaversineDistance", () => {
  describe("should calculate distance correctly", () => {
    it("should return 0 for same coordinates", () => {
      const point: Coordinates = {
        latitude: 40.7128,
        longitude: -74.006,
      };
      const distance = calculateHaversineDistance(point, point);
      expect(distance).toBe(0);
    });

    it("should calculate distance between NYC coordinates correctly", () => {
      // NYC coordinates
      const nyc: Coordinates = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      // Philadelphia coordinates (approximately 130 km from NYC)
      const philly: Coordinates = {
        latitude: 39.9526,
        longitude: -75.1652,
      };

      const distance = calculateHaversineDistance(nyc, philly);

      // Should be approximately 120-140 km
      expect(distance).toBeGreaterThan(120);
      expect(distance).toBeLessThan(140);
    });

    it("should calculate distance between known coordinates", () => {
      // London coordinates
      const london: Coordinates = {
        latitude: 51.5074,
        longitude: -0.1278,
      };

      // Paris coordinates (approximately 344 km from London)
      const paris: Coordinates = {
        latitude: 48.8566,
        longitude: 2.3522,
      };

      const distance = calculateHaversineDistance(london, paris);

      // Should be approximately 340-350 km
      expect(distance).toBeGreaterThan(330);
      expect(distance).toBeLessThan(360);
    });

    it("should return same distance regardless of order", () => {
      const point1: Coordinates = {
        latitude: 40.7128,
        longitude: -74.006,
      };
      const point2: Coordinates = {
        latitude: 34.0522,
        longitude: -118.2437,
      };

      const distance1 = calculateHaversineDistance(point1, point2);
      const distance2 = calculateHaversineDistance(point2, point1);

      expect(distance1).toBe(distance2);
    });
  });

  describe("should handle edge cases", () => {
    it("should handle coordinates on opposite sides of the globe", () => {
      // New York
      const nyc: Coordinates = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      // Point approximately opposite on the globe (in the Indian Ocean)
      const opposite: Coordinates = {
        latitude: -40.7128,
        longitude: 105.994, // 180 - (-74.006) adjusted
      };

      const distance = calculateHaversineDistance(nyc, opposite);

      // Should be approximately half the Earth's circumference (~20,000 km)
      expect(distance).toBeGreaterThan(18000);
      expect(distance).toBeLessThan(20040);
    });

    it("should handle coordinates at the equator", () => {
      // Point on equator at 0° longitude
      const point1: Coordinates = {
        latitude: 0,
        longitude: 0,
      };

      // Point on equator at 90° longitude
      const point2: Coordinates = {
        latitude: 0,
        longitude: 90,
      };

      const distance = calculateHaversineDistance(point1, point2);

      // Should be approximately 1/4 of Earth's circumference (~10,000 km)
      expect(distance).toBeGreaterThan(9500);
      expect(distance).toBeLessThan(10020);
    });

    it("should handle coordinates at the poles", () => {
      // North Pole
      const northPole: Coordinates = {
        latitude: 90,
        longitude: 0,
      };

      // South Pole
      const southPole: Coordinates = {
        latitude: -90,
        longitude: 0,
      };

      const distance = calculateHaversineDistance(northPole, southPole);

      // Should be approximately half the Earth's circumference (~20,000 km)
      expect(distance).toBeGreaterThan(19900);
      expect(distance).toBeLessThan(20040);
    });

    it("should handle very small distances", () => {
      // Two points very close together (about 1 km apart)
      const point1: Coordinates = {
        latitude: 40.7128,
        longitude: -74.006,
      };
      const point2: Coordinates = {
        latitude: 40.7128 + 0.009, // Approximately 1 km north
        longitude: -74.006,
      };

      const distance = calculateHaversineDistance(point1, point2);

      // Should be approximately 1 km
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });
  });

  describe("should handle invalid inputs gracefully", () => {
    it("should handle negative latitudes", () => {
      const point1: Coordinates = {
        latitude: -40.7128,
        longitude: -74.006,
      };
      const point2: Coordinates = {
        latitude: -34.0522,
        longitude: -118.2437,
      };

      const distance = calculateHaversineDistance(point1, point2);

      // Should still calculate a valid distance
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe("number");
      expect(isNaN(distance)).toBe(false);
    });

    it("should handle longitudes greater than 180", () => {
      // Longitude wrapped around (e.g., 200° = -160°)
      const point1: Coordinates = {
        latitude: 40.7128,
        longitude: 200, // Equivalent to -160
      };
      const point2: Coordinates = {
        latitude: 40.7128,
        longitude: -160,
      };

      // These should be treated as the same point for distance calculation
      // (though mathematically they're different, the formula handles it)
      const distance = calculateHaversineDistance(point1, point2);

      // Should calculate a distance (may not be 0 due to how the formula works)
      expect(typeof distance).toBe("number");
      expect(isNaN(distance)).toBe(false);
    });

    it("should handle zero coordinates", () => {
      const point: Coordinates = {
        latitude: 0,
        longitude: 0,
      };
      const distance = calculateHaversineDistance(point, point);
      expect(distance).toBe(0);
    });
  });

  describe("should maintain accuracy", () => {
    it("should calculate distance with reasonable precision", () => {
      // Known distance: NYC to Boston is approximately 306 km
      const nyc: Coordinates = {
        latitude: 40.7128,
        longitude: -74.006,
      };
      const boston: Coordinates = {
        latitude: 42.3601,
        longitude: -71.0589,
      };

      const distance = calculateHaversineDistance(nyc, boston);

      // Should be within 10% of actual distance
      expect(distance).toBeGreaterThan(275);
      expect(distance).toBeLessThan(337);
    });

    it("should handle high precision coordinates", () => {
      // Very precise coordinates
      const point1: Coordinates = {
        latitude: 40.712776,
        longitude: -74.005941,
      };
      const point2: Coordinates = {
        latitude: 40.758896,
        longitude: -73.98513,
      };

      const distance = calculateHaversineDistance(point1, point2);

      // Should return a valid number
      expect(typeof distance).toBe("number");
      expect(isNaN(distance)).toBe(false);
      expect(distance).toBeGreaterThan(0);
    });
  });
});
