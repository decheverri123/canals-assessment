/**
 * Unit tests for haversine distance calculation utility
 */

import { calculateHaversineDistance } from "../../src/utils/haversine";
import { Coordinates } from "../../src/types/coordinates.types";

describe("calculateHaversineDistance", () => {
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
