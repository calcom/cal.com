/**
 * Location types for event type management
 * These types are used across the companion app for handling event type locations
 */

/**
 * Valid location types supported by the Cal.com API
 */
export type LocationType =
  | "integration"
  | "address"
  | "link"
  | "phone"
  | "attendeeAddress"
  | "attendeePhone"
  | "attendeeDefined";

/**
 * Valid integration types for conferencing apps
 */
export type IntegrationType =
  | "cal-video"
  | "google-meet"
  | "zoom"
  | "office365-video"
  | "msteams"
  | "webex"
  | "jitsi";

/**
 * Represents a location item in the UI
 */
export interface LocationItem {
  /** Unique identifier for the location (used for list rendering) */
  id: string;
  /** The type of location */
  type: LocationType;
  /** Integration app ID (for conferencing apps) */
  integration?: string;
  /** Physical address (for address type) */
  address?: string;
  /** Meeting link URL (for link type) */
  link?: string;
  /** Phone number (for phone types) */
  phone?: string;
  /** Whether the location is public */
  public?: boolean;
  /** Display name shown in the UI */
  displayName: string;
  /** Icon URL for the location */
  iconUrl: string | null;
}

/**
 * Location object as returned from the API
 */
export interface ApiLocation {
  type: string;
  integration?: string;
  address?: string;
  link?: string;
  phone?: string;
  public?: boolean;
}

/**
 * Location input for API requests
 */
export interface ApiLocationInput {
  type: string;
  integration?: string;
  address?: string;
  link?: string;
  phone?: string;
  public?: boolean;
}

/**
 * Location option for dropdown selection
 */
export interface LocationOption {
  label: string;
  value: string;
  iconUrl: string | null;
  category?: string;
}

/**
 * Grouped location options for dropdown
 */
export interface LocationOptionGroup {
  category: string;
  options: LocationOption[];
}
