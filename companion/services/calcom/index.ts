/**
 * Cal.com API Service
 *
 * This module provides a unified interface for interacting with the Cal.com API v2.
 * It is organized into logical submodules for better maintainability:
 *
 * - auth: Authentication configuration and token management
 * - bookings: Booking CRUD operations and actions
 * - conferencing: Conferencing options
 * - event-types: Event type CRUD operations
 * - private-links: Private link management for event types
 * - request: Core HTTP request functionality
 * - schedules: Schedule CRUD operations
 * - user: User profile management
 * - utils: JSON parsing and payload sanitization utilities
 * - webhooks: Webhook management (global and event type specific)
 */

// Re-export types for backward compatibility
export type {
  EventType,
  CreateEventTypeInput,
  Booking,
  BookingParticipationResult,
  Schedule,
  UserProfile,
  ConferencingOption,
  Webhook,
  CreateWebhookInput,
  UpdateWebhookInput,
  PrivateLink,
  CreatePrivateLinkInput,
  UpdatePrivateLinkInput,
  BookingLimitsCount,
  BookingLimitsDuration,
  ConfirmationPolicy,
} from "../types";

// Import all functions from submodules
import {
  clearAuth,
  setAccessToken,
  setRefreshTokenFunction,
  setTokenRefreshCallback,
} from "./auth";
import {
  addGuests,
  cancelBooking,
  confirmBooking,
  declineBooking,
  getBookingByUid,
  getBookingParticipation,
  getBookings,
  getConferencingSessions,
  getRecordings,
  getTranscripts,
  markAbsent,
  rescheduleBooking,
  updateLocation,
  updateLocationV2,
} from "./bookings";
import { getConferencingOptions } from "./conferencing";
import {
  createEventType,
  deleteEventType,
  getEventTypeById,
  getEventTypes,
  updateEventType,
} from "./event-types";
import {
  createEventTypePrivateLink,
  deleteEventTypePrivateLink,
  getEventTypePrivateLinks,
  updateEventTypePrivateLink,
} from "./private-links";
import { testRawBookingsAPI } from "./request";
import {
  createSchedule,
  deleteSchedule,
  duplicateSchedule,
  getScheduleById,
  getSchedules,
  updateSchedule,
} from "./schedules";
import {
  clearUserProfile,
  getCurrentUser,
  getUsername,
  getUserProfile,
  updateUserProfile,
} from "./user";
import {
  createEventTypeWebhook,
  createWebhook,
  deleteEventTypeWebhook,
  deleteWebhook,
  getEventTypeWebhooks,
  getWebhooks,
  updateEventTypeWebhook,
  updateWebhook,
} from "./webhooks";

// Re-export the booking participation helper for direct use
export { getBookingParticipation };

// Export the unified CalComAPIService object for backward compatibility
export const CalComAPIService = {
  // Auth
  setAccessToken,
  setRefreshTokenFunction,
  clearAuth,
  setTokenRefreshCallback,

  // User
  getCurrentUser,
  updateUserProfile,
  getUserProfile,
  getUsername,
  clearUserProfile,

  // Debug
  testRawBookingsAPI,

  // Event Types
  deleteEventType,
  createEventType,
  getEventTypes,
  getEventTypeById,
  updateEventType,

  // Bookings
  cancelBooking,
  rescheduleBooking,
  confirmBooking,
  declineBooking,
  markAbsent,
  addGuests,
  updateLocation,
  updateLocationV2,
  getRecordings,
  getConferencingSessions,
  getTranscripts,
  getBookingByUid,
  getBookings,

  // Schedules
  getSchedules,
  createSchedule,
  getScheduleById,
  updateSchedule,
  duplicateSchedule,
  deleteSchedule,

  // Conferencing
  getConferencingOptions,

  // Webhooks
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getEventTypeWebhooks,
  createEventTypeWebhook,
  updateEventTypeWebhook,
  deleteEventTypeWebhook,

  // Private Links
  getEventTypePrivateLinks,
  createEventTypePrivateLink,
  updateEventTypePrivateLink,
  deleteEventTypePrivateLink,
};
