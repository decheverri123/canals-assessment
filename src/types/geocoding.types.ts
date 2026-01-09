/**
 * Geocoding service interface and types
 */

import { Coordinates } from "./coordinates.types";

export interface IGeocodingService {
  geocode(address: string): Promise<Coordinates>;
}
