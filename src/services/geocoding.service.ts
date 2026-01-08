import { IGeocodingService, GeocodeResult } from '../types/geocoding.types';

/**
 * Mock geocoding service implementation
 * Returns hardcoded NYC coordinates for any address
 */
export class GeocodingService implements IGeocodingService {
  /**
   * Geocode an address to latitude and longitude coordinates
   * @param address The address to geocode
   * @returns Promise resolving to coordinates (mock: always returns NYC coordinates)
   */
  async geocode(address: string): Promise<GeocodeResult> {
    // Mock implementation: return hardcoded NYC coordinates
    // In a real implementation, this would call a geocoding API
    return {
      lat: 40.7128,
      lng: -74.0060,
    };
  }
}
