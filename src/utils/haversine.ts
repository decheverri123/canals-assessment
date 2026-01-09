/**
 * Haversine formula implementation for calculating distance between two coordinates
 */

import { Coordinates } from '../types/coordinates.types';

/**
 * Calculate distance between two coordinate points
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number;
/**
 * Calculate distance between two coordinate points (legacy overload)
 * @param lat1 Latitude of first point in degrees
 * @param lng1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lng2 Longitude of second point in degrees
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number;
export function calculateHaversineDistance(
  point1OrLat1: Coordinates | number,
  point2OrLng1?: Coordinates | number,
  lat2?: number,
  lng2?: number
): number {
  const R = 6371; // Earth's radius in kilometers

  // Handle both overloads: Coordinates objects or separate lat/lng numbers
  let lat1: number;
  let lng1: number;
  let lat2Final: number;
  let lng2Final: number;

  if (typeof point1OrLat1 === 'number' && typeof point2OrLng1 === 'number' && lat2 !== undefined && lng2 !== undefined) {
    // Legacy overload: separate lat/lng parameters
    lat1 = point1OrLat1;
    lng1 = point2OrLng1;
    lat2Final = lat2;
    lng2Final = lng2;
  } else if (typeof point1OrLat1 === 'object' && typeof point2OrLng1 === 'object') {
    // New overload: Coordinates objects
    lat1 = point1OrLat1.latitude;
    lng1 = point1OrLat1.longitude;
    lat2Final = point2OrLng1.latitude;
    lng2Final = point2OrLng1.longitude;
  } else {
    throw new Error('Invalid arguments to calculateHaversineDistance');
  }

  // Convert degrees to radians
  const dLat = toRadians(lat2Final - lat1);
  const dLng = toRadians(lng2Final - lng1);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2Final)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
