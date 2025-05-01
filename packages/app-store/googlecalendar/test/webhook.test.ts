// Import mocks for Google Calendar
import prismock from "../../../../tests/libs/__mocks__/prisma";
// Import the mock function directly
import { calendarEventsListMock } from "../lib/__mocks__/googleapis";

import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, it, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

// Import webhook handler
import { postHandler as webhookHandler } from "../api/webhook.handler";

vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => ({
    getTokenObjectOrFetch: vi.fn().mockResolvedValue({
      token: "test-token",
    }),
    refreshOAuthToken: vi.fn().mockResolvedValue({
      token: "test-token",
    }),
  })),
}));

// Test utility to create mock requests and responses
function createMockReqRes(headers = {}) {
  const req = {
    method: "POST",
    headers: {
      "x-goog-channel-token": "test-webhook-token",
      "x-goog-channel-id": "test-channel-id",
      "x-goog-resource-id": "test-resource-id",
      "x-goog-resource-state": "exists",
      "x-goog-channel-expiration": "Sat, 22 Mar 2025 19:14:43 GMT",
      "x-goog-message-number": "1",
      "x-goog-resource-uri": "https://www.googleapis.com/calendar/v3/calendars/primary/events?alt=json",
      ...headers,
    },
    body: {},
  } as unknown as NextApiRequest;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as NextApiResponse;

  return { req, res };
}

describe("Google Calendar Webhook Handler", () => {
  beforeEach(async () => {
    // Set environment variables for the test
    vi.stubEnv("GOOGLE_WEBHOOK_TOKEN", "test-webhook-token");
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
    // Note: getGoogleAppKeys expects redirect_uris as a comma-separated string internally
    vi.stubEnv(
      "GOOGLE_REDIRECT_URIS",
      "http://localhost:3000/api/auth/callback/google,http://localhost:3000"
    );

    // Reset all mocks
    vi.clearAllMocks();

    // Clear prismock database between tests
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();
  });

  // Helper function to set up test data
  async function setupTestData({
    calendarEventId = "google-event-123",
    externalCalendarId = "primary",
    bookingStartTime = dayjs().add(1, "day").toDate(),
    bookingEndTime = dayjs().add(1, "day").add(30, "minutes").toDate(),
    bookingStatus = BookingStatus.ACCEPTED,
  } = {}) {
    // crreate an App record
    await prismock.app.create({
      data: {
        slug: "google-calendar",
        dirName: "googlecalendar",
        keys: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          redirect_uris: ["http://localhost:3000/api/auth/callback/google", "http://localhost:3000"],
        },
      },
    });

    // Create user
    const user = await prismock.user.create({
      data: {
        email: "test-user@example.com",
        username: "test-user",
      },
    });

    // Create credential
    const credential = await prismock.credential.create({
      data: {
        type: "google_calendar",
        key: {
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: 1672545600000,
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
        },
        userId: user.id,
      },
    });

    // Create event type
    const eventType = await prismock.eventType.create({
      data: {
        title: "Test Event",
        slug: "test-event",
        userId: user.id,
        length: 30,
      },
    });

    // Create booking with specified times
    const booking = await prismock.booking.create({
      data: {
        uid: "test-booking-uid",
        title: "Test Booking",
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        userId: user.id,
        status: bookingStatus,
        eventTypeId: eventType.id,
      },
    });

    // Create booking reference
    const bookingReference = await prismock.bookingReference.create({
      data: {
        type: "google_calendar",
        uid: "test-ref-uid",
        bookingId: booking.id,
        calendarEventId, // This should match the mocked event ID
        meetingId: null,
        meetingPassword: null,
        meetingUrl: null,
        externalCalendarId,
        deleted: null,
      },
    });

    // Create destination calendar
    const destinationCalendar = await prismock.destinationCalendar.create({
      data: {
        integration: "google_calendar",
        externalId: externalCalendarId,
        userId: user.id,
        credentialId: credential.id,
        booking: { connect: { id: booking.id } },
        googleChannelId: "test-channel-id",
        googleChannelResourceId: "test-resource-id",
      },
    });

    return { user, credential, booking, bookingReference, destinationCalendar };
  }

  it("should cancel a booking when Google Calendar event is cancelled", async () => {
    // Set up test data
    const { booking, destinationCalendar } = await setupTestData();

    calendarEventsListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "google-event-123",
            status: "cancelled", // This is what triggers the cancellation
            start: { dateTime: dayjs().add(1, "day").toISOString() },
            end: { dateTime: dayjs().add(1, "day").add(30, "minutes").toISOString() },
          },
        ],
      },
    });

    // Set up mock request and response
    const { req } = createMockReqRes();

    // Call the webhook handler and expect it to resolve
    await expect(webhookHandler(req)).resolves.toBeDefined();

    // Verify booking status was updated to CANCELLED
    const updatedBooking = await prismock.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking).not.toBeNull();
    expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(updatedBooking?.cancelledBy).toBe("googleCalendarSync");

    // Verify destination calendar was updated with lastProcessedTime
    const updatedDestinationCalendar = await prismock.destinationCalendar.findUnique({
      where: { id: destinationCalendar.id },
    });

    expect(updatedDestinationCalendar).not.toBeNull();
    expect(updatedDestinationCalendar?.lastProcessedTime).not.toBeNull();
  });

  it("should update booking times when Google Calendar event times change", async () => {
    // Create booking with future time
    const { booking } = await setupTestData();

    // Original booking times
    const originalStartTime = booking.startTime;
    const originalEndTime = booking.endTime;

    // New times that will be returned from Google Calendar
    const newStartTime = dayjs().add(2, "day").toDate();
    const newEndTime = dayjs().add(2, "day").add(45, "minutes").toDate();

    // Mock Google Calendar API to return updated event times
    calendarEventsListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "google-event-123",
            status: "confirmed", // Not cancelled, just updated
            start: { dateTime: dayjs(newStartTime).toISOString() },
            end: { dateTime: dayjs(newEndTime).toISOString() },
          },
        ],
      },
    });

    // Set up mock request and response
    const { req } = createMockReqRes();

    // Call the webhook handler and expect it to resolve
    await expect(webhookHandler(req)).resolves.toBeDefined();

    // Verify booking times were updated
    const updatedBooking = await prismock.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking).not.toBeNull();
    expect(updatedBooking?.status).toBe(BookingStatus.ACCEPTED); // Status should remain ACCEPTED
    expect(updatedBooking?.rescheduledBy).toBe("google_calendar");

    // Check that times were updated
    expect(updatedBooking?.startTime.getTime()).not.toBe(originalStartTime.getTime());
    expect(updatedBooking?.endTime.getTime()).not.toBe(originalEndTime.getTime());

    // Verify times match the new times from Google Calendar
    expect(dayjs(updatedBooking?.startTime).format("YYYY-MM-DD HH:mm")).toBe(
      dayjs(newStartTime).format("YYYY-MM-DD HH:mm")
    );
    expect(dayjs(updatedBooking?.endTime).format("YYYY-MM-DD HH:mm")).toBe(
      dayjs(newEndTime).format("YYYY-MM-DD HH:mm")
    );
  });

  it("should ignore updates for past events", async () => {
    // Set up test data with past event
    const pastStartTime = dayjs().subtract(1, "day").toDate();
    const pastEndTime = dayjs().subtract(1, "day").add(30, "minutes").toDate();

    const { booking } = await setupTestData({
      bookingStartTime: pastStartTime,
      bookingEndTime: pastEndTime,
    });

    // Mock Google Calendar API to return event with updated times
    // Even though it's in the past, we'll set new times to make sure they're NOT applied
    const newStartTime = dayjs().subtract(1, "day").add(1, "hour").toDate();
    const newEndTime = dayjs().subtract(1, "day").add(1.5, "hours").toDate();

    calendarEventsListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "google-event-123",
            status: "confirmed",
            start: { dateTime: dayjs(newStartTime).toISOString() },
            end: { dateTime: dayjs(newEndTime).toISOString() },
          },
        ],
      },
    });

    // Set up mock request and response
    const { req } = createMockReqRes();

    // Call the webhook handler and expect it to resolve
    await expect(webhookHandler(req)).resolves.toBeDefined();

    // Verify booking remains unchanged
    const updatedBooking = await prismock.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking).not.toBeNull();
    // Times should NOT be updated because it's a past event
    expect(updatedBooking?.startTime.getTime()).toBe(pastStartTime.getTime());
    expect(updatedBooking?.endTime.getTime()).toBe(pastEndTime.getTime());

    // Shouldn't be rescheduled
    expect(updatedBooking?.rescheduledBy).toBe(null);
  });

  it("should handle multiple webhook notifications for the same event correctly", async () => {
    // Set up test data
    const { booking } = await setupTestData();

    // Mock Google Calendar API to return cancelled event
    calendarEventsListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "google-event-123",
            status: "cancelled",
            start: { dateTime: dayjs().add(1, "day").toISOString() },
            end: { dateTime: dayjs().add(1, "day").add(30, "minutes").toISOString() },
          },
        ],
      },
    });

    // First notification
    const { req: req1 } = createMockReqRes({
      "x-goog-message-number": "1", // First message
    });

    // Call webhook handler for first notification and expect it to resolve
    await expect(webhookHandler(req1)).resolves.toBeDefined();

    // Verify booking was cancelled
    const updatedBooking1 = await prismock.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking1).not.toBeNull();
    expect(updatedBooking1?.status).toBe(BookingStatus.CANCELLED);
    expect(updatedBooking1?.cancelledBy).toBe("googleCalendarSync");

    // Second identical notification
    const { req: req2 } = createMockReqRes({
      "x-goog-message-number": "2", // Second message
    });

    // Call webhook handler for second notification and expect it to resolve
    await expect(webhookHandler(req2)).resolves.toBeDefined();

    // Verify booking is still cancelled (no double cancellation issues)
    const updatedBooking2 = await prismock.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking2).not.toBeNull();
    expect(updatedBooking2?.status).toBe(BookingStatus.CANCELLED);
  });
});
