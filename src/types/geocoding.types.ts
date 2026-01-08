/**
 * Geocoding service interface and types
 */

import { Coordinates } from './coordinates.types';

export interface IGeocodingService {
  geocode(address: string): Promise<GeocodeResult>;
}

/**
 * Geocode result - extends Coordinates for consistency
 * Maintains backward compatibility with lat/lng properties
 */
export interface GeocodeResult extends Coordinates {
  /** @deprecated Use latitude instead */
  lat: number;
  /** @deprecated Use longitude instead */
  lng: number;
}
