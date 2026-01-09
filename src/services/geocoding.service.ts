import { IGeocodingService } from '../types/geocoding.types';
import { Coordinates } from '../types/coordinates.types';

/**
 * Mock geocoding service implementation
 * Returns coordinates based on city detection in the address
 */
export class MockGeocodingService implements IGeocodingService {
  private static readonly MOCK_COORDINATES: Record<string, Coordinates> = {
    'new york': { latitude: 40.7128, longitude: -74.0060 },
    'los angeles': { latitude: 34.0522, longitude: -118.2437 },
    'chicago': { latitude: 41.8781, longitude: -87.6298 },
  };

  /**
   * Geocode an address to latitude and longitude coordinates
   * @param address The address to geocode
   * @returns Promise resolving to coordinates (mock: returns coordinates based on city detection)
   */
  async geocode(address: string): Promise<Coordinates> {
    // Mock implementation: detect city from address and return appropriate coordinates
    // In a real implementation, this would call a geocoding API
    const normalized = address.toLowerCase();
    
    for (const [city, coords] of Object.entries(MockGeocodingService.MOCK_COORDINATES)) {
      if (normalized.includes(city)) {
        return { ...coords };
      }
    }
    
    // Default to NYC
    return { 
      latitude: 40.7128, 
      longitude: -74.0060
    };
  }
}
