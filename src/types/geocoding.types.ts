/**
 * Geocoding service interface and types
 */

export interface IGeocodingService {
  geocode(address: string): Promise<GeocodeResult>;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
}
