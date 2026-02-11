/**
 * Types for Google Calendar Working Location sync
 */

/**
 * Google Calendar Working Location types
 * @see https://developers.google.com/workspace/calendar/api/v3/reference/events#workingLocationProperties
 */
export type GoogleWorkingLocationType = "homeOffice" | "officeLocation" | "customLocation";

/**
 * Configuration stored in Schedule.syncConfig for Google Working Location sync
 */
export interface GoogleWorkingLocationSyncConfig {
  /** Google Calendar ID to sync from (usually "primary") */
  calendarId: string;
  /** Which location types to consider as "available" */
  locationTypes: GoogleWorkingLocationType[];
  /** Optional: Only sync locations matching this label (for officeLocation/customLocation) */
  locationLabel?: string;
}

/**
 * Working location event from Google Calendar
 */
export interface GoogleWorkingLocationEvent {
  id: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  locationType: GoogleWorkingLocationType;
  /** Label for office or custom locations */
  locationLabel?: string;
  /** Building ID for office locations */
  buildingId?: string;
}

/**
 * Sync source identifier for Google Working Location
 */
export const GOOGLE_WORKING_LOCATION_SYNC_SOURCE = "google_calendar_working_location";
