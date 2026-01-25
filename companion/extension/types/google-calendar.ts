/**
 * Types for Google Calendar integration in the extension
 * These types are used for parsing and handling Google Calendar data
 */

/**
 * Represents a time slot parsed from Google Calendar
 */
export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
}

/**
 * Parsed data from Google Calendar chip elements
 */
export interface ParsedGoogleCalendarData {
  title?: string;
  startTime?: string;
  endTime?: string;
  detectedDuration?: number;
  attendees?: string[];
  location?: string;
  slots: TimeSlot[];
}

/**
 * Basic event type information used in the extension
 */
export interface EventTypeBasic {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
}

/**
 * Response from fetching event types
 */
export interface EventTypesResponse {
  data?: EventTypeBasic[];
  error?: string;
}

/**
 * Token request for OAuth exchange
 */
export interface TokenExchangeRequest {
  grant_type: string;
  client_id: string;
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
}

/**
 * Slots grouped by date for display
 */
export interface SlotsByDate {
  [date: string]: TimeSlot[];
}
