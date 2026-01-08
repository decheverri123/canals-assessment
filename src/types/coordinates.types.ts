/**
 * Coordinate types for latitude and longitude
 */

/**
 * Geographic coordinates interface
 * Uses latitude/longitude naming to match Prisma schema and common conventions
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}
