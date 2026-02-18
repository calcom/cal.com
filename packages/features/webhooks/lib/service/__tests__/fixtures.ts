import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

/**
 * Test Fixtures for Webhook Payload Compatibility Testing
 *
 * These fixtures provide consistent test data for comparing
 * current implementation vs new Producer/Consumer pattern.
 */

export function createTestBooking() {
  return {
    id: 123,
    uid: "test-booking-uid-123",
    eventTypeId: 456,
    userId: 789,
    startTime: new Date("2024-01-15T10:00:00Z"),
    endTime: new Date("2024-01-15T11:00:00Z"),
    title: "Test Booking",
    description: "Test booking description",
    status: "ACCEPTED" as const,
    smsReminderNumber: "+1234567890",
  };
}

export function createTestEventType() {
  return {
    id: 456,
    title: "30 Min Meeting",
    slug: "30min",
    length: 30,
    description: "A 30 minute meeting",
    teamId: null,
    userId: 789,
  };
}

export function createTestUser() {
  return {
    id: 789,
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    timeZone: "America/New_York",
  };
}

export function createTestCalendarEvent(): CalendarEvent {
  return {
    type: "30min",
    title: "Test Booking",
    description: "Test booking description",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    organizer: {
      email: "test@example.com",
      name: "Test User",
      timeZone: "America/New_York",
      language: { locale: "en" },
    },
    attendees: [
      {
        email: "attendee@example.com",
        name: "Test Attendee",
        timeZone: "America/Los_Angeles",
        language: { locale: "en" },
      },
    ],
    uid: "test-booking-uid-123",
    location: "Zoom",
  };
}

export function createTestWebhookSubscriber() {
  return {
    id: "webhook-sub-1",
    subscriberUrl: "https://example.com/webhook",
    payloadTemplate: null,
    appId: null,
    secret: "test-secret-key",
    time: null,
    timeUnit: null,
    eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED, WebhookTriggerEvents.BOOKING_CANCELLED],
  };
}

/**
 * Test data for all webhook trigger events
 */
export const testTriggerEvents = {
  bookingCreated: WebhookTriggerEvents.BOOKING_CREATED,
  bookingCancelled: WebhookTriggerEvents.BOOKING_CANCELLED,
  bookingRescheduled: WebhookTriggerEvents.BOOKING_RESCHEDULED,
  bookingRequested: WebhookTriggerEvents.BOOKING_REQUESTED,
  bookingRejected: WebhookTriggerEvents.BOOKING_REJECTED,
  bookingPaymentInitiated: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
  bookingPaid: WebhookTriggerEvents.BOOKING_PAID,
  bookingNoShowUpdated: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
  formSubmitted: WebhookTriggerEvents.FORM_SUBMITTED,
  recordingReady: WebhookTriggerEvents.RECORDING_READY,
  oooCreated: WebhookTriggerEvents.OOO_CREATED,
};
