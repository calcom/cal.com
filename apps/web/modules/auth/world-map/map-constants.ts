import { MAP_COLS } from "./world-map-data";

// Convert lat/lng to map row/col (floating point)
export function lngToColF(lng: number): number {
  return ((lng + 180) / 360) * (MAP_COLS - 1);
}

export function latToRowF(lat: number): number {
  // Map lat range: 85 (top) to -60 (bottom) → row 0 to MAP_ROWS-1
  const MAP_ROWS = 100; // matches world-map-data
  return ((85 - lat) / (85 + 60)) * (MAP_ROWS - 1);
}

// Convert longitude to map column (0-based)
export function lngToCol(lng: number): number {
  return ((lng + 180) / 360) * (MAP_COLS - 1);
}

// Major timezones: label, UTC offset hours, longitude (approx center)
export const TIMEZONES = [
  { label: "UTC -8", offset: -8, lng: -120, city: "LA" },
  { label: "UTC -6", offset: -6, lng: -90, city: "Chicago" },
  { label: "UTC -4", offset: -4, lng: -60, city: "Santiago" },
  { label: "UTC -2", offset: -2, lng: -30, city: "Atlantic" },
  { label: "UTC +0", offset: 0, lng: 0, city: "London" },
  { label: "UTC +2", offset: 2, lng: 30, city: "Cairo" },
  { label: "UTC +4", offset: 4, lng: 60, city: "Dubai" },
  { label: "UTC +6", offset: 6, lng: 90, city: "Dhaka" },
  { label: "UTC +8", offset: 8, lng: 120, city: "Singapore" },
] as const;

// Cities for pings and connection arcs (lat/lng)
export const CITIES = [
  { name: "San Francisco", lat: 37.8, lng: -122.4, offset: -8 },
  { name: "New York", lat: 40.7, lng: -74.0, offset: -5 },
  { name: "São Paulo", lat: -23.5, lng: -46.6, offset: -3 },
  { name: "London", lat: 51.5, lng: -0.1, offset: 0 },
  { name: "Paris", lat: 48.9, lng: 2.3, offset: 1 },
  { name: "Dubai", lat: 25.2, lng: 55.3, offset: 4 },
  { name: "Mumbai", lat: 19.1, lng: 72.9, offset: 5.5 },
  { name: "Singapore", lat: 1.3, lng: 103.8, offset: 8 },
  { name: "Tokyo", lat: 35.7, lng: 139.7, offset: 9 },
  { name: "Sydney", lat: -33.9, lng: 151.2, offset: 11 },
] as const;

// Speed steps for arrow key control (multiplier values)
// 0 = paused, 360 = ~4min cycle, 1440 = ~1min cycle
export const SPEED_STEPS = [0, 60, 180, 360, 720, 1440];
export const SPEED_LABELS = ["⏸", "×1", "×2", "×4", "×8", "×16"];
export const DEFAULT_SPEED_INDEX = 3; // 360x
