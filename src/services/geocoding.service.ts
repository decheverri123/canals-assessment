import { IGeocodingService, GeocodeResult } from '../types/geocoding.types';

/**
 * Mock geocoding service implementation
 * Returns coordinates based on city detection in the address
 */
export class GeocodingService implements IGeocodingService {
  /**
   * Geocode an address to latitude and longitude coordinates
   * @param address The address to geocode
   * @returns Promise resolving to coordinates (mock: returns coordinates based on city detection)
   */
  async geocode(address: string): Promise<GeocodeResult> {
    // Mock implementation: detect city from address and return appropriate coordinates
    // In a real implementation, this would call a geocoding API
    const addressLower = address.toLowerCase();

    // West Coast Warehouse: Los Angeles, CA
    if (
      addressLower.includes('los angeles') ||
      addressLower.includes('la,') ||
      (addressLower.includes(', ca') && !addressLower.includes('sacramento'))
    ) {
      return {
        latitude: 34.0522,
        longitude: -118.2437,
        lat: 34.0522,
        lng: -118.2437,
      };
    }

    // Central Warehouse: Chicago, IL
    if (addressLower.includes('chicago') || addressLower.includes(', il')) {
      return {
        latitude: 41.8781,
        longitude: -87.6298,
        lat: 41.8781,
        lng: -87.6298,
      };
    }

    // East Coast Warehouse: New York, NY (default)
    // Matches: New York, NYC, NY (including Albany, NY), Boston, MA, or any other address
    return {
      latitude: 40.7128,
      longitude: -74.0060,
      lat: 40.7128,
      lng: -74.0060,
    };
  }
}
