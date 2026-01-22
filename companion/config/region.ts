/**
 * Region Configuration for Cal.com Companion App
 *
 * This module provides centralized configuration for region-aware URLs.
 * Supports US (default) and EU regions with different API and app endpoints.
 */

export type Region = "US" | "EU";

export const DEFAULT_REGION: Region = "US";

export const REGION_STORAGE_KEY = "cal_region";

interface RegionConfig {
  appBaseUrl: string;
  apiBaseUrl: string;
}

const REGION_CONFIGS: Record<Region, RegionConfig> = {
  US: {
    appBaseUrl: "https://app.cal.com",
    apiBaseUrl: "https://api.cal.com/v2",
  },
  EU: {
    appBaseUrl: "https://app.cal.eu",
    apiBaseUrl: "https://api.cal.eu/v2",
  },
};

export function getAppBaseUrl(region: Region): string {
  return REGION_CONFIGS[region].appBaseUrl;
}

export function getApiBaseUrl(region: Region): string {
  return REGION_CONFIGS[region].apiBaseUrl;
}

export function getAssetUrl(region: Region, path: string): string {
  const baseUrl = getAppBaseUrl(region);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export function getSignupUrl(region: Region): string {
  return `${getAppBaseUrl(region)}/signup`;
}

export function getBookingUrl(region: Region, bookingUid: string): string {
  return `${getAppBaseUrl(region)}/booking/${bookingUid}`;
}

export function getRescheduleUrl(region: Region, rescheduleUid: string): string {
  return `${getAppBaseUrl(region)}/reschedule/${rescheduleUid}`;
}

export function isValidRegion(value: string): value is Region {
  return value === "US" || value === "EU";
}

export const REGION_OPTIONS: Array<{ value: Region; label: string }> = [
  { value: "US", label: "United States" },
  { value: "EU", label: "European Union" },
];

export function getAppHostnames(): string[] {
  return Object.values(REGION_CONFIGS).map((config) => new URL(config.appBaseUrl).hostname);
}
