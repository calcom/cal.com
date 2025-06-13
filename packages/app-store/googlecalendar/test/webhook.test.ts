// Import mocks for Google Calendar
import prismock from "../../../../tests/libs/__mocks__/prisma";
// Import the mock function directly
import { calendarEventsListMock, freebusyQueryMock } from "../lib/__mocks__/googleapis";

import type { NextApiRequest } from "next";
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
    request: vi.fn().mockImplementation(async (fn) => {
      const res = await fn({
        url: "https://www.googleapis.com/calendar/v3/calendars/primary/events?alt=json",
        method: "GET",
        headers: {
          "x-goog-channel-token": "test-webhook-token",
        },
      });
      return {
        json: await res.json(),
      };
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
      "x-goog-channel-expiration": "Sat, 22 Mar 2025 19:14:43 GMT",
      "x-goog-message-number": "1",
      "x-goog-resource-uri": "https://www.googleapis.com/calendar/v3/calendars/primary/events?alt=json",
      ...headers,
    },
    body: {},
  } as unknown as NextApiRequest;

  return req;
}

function findBooking(bookingId: number) {
  return prismock.booking.findUnique({
    where: { id: bookingId },
  });
}

function findCalendarSync(calendarSyncId: string) {
  return prismock.calendarSync.findUnique({
    where: { id: calendarSyncId },
  });
}

async function expectBookingToBeCancelled({
  bookingId,
  calendarSyncId,
}: {
  bookingId: number;
  calendarSyncId: string | null;
}) {
  if (!calendarSyncId) {
    throw new Error("Calendar sync ID is required");
  }
  // Verify booking status was updated to CANCELLED
  const updatedBooking = await findBooking(bookingId);
  expect(updatedBooking).not.toBeNull();
  expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
  expect(updatedBooking?.cancelledBy).toBe("Google Calendar");

  // Verify destination calendar was updated with lastProcessedTime
  const updatedCalendarSync = await findCalendarSync(calendarSyncId);
  expect(updatedCalendarSync).not.toBeNull();
  expect(updatedCalendarSync?.lastSyncedDownAt).not.toBeNull();
}

async function expectBookingToHaveBeenRescheduledAtTime({
  bookingId,
  calendarSyncId,
  rescheduledBy,
  originalStartTime,
  originalEndTime,
  newStartTime,
  newEndTime,
}: {
  bookingId: number;
  calendarSyncId: string | null;
  rescheduledBy: string;
  originalStartTime: Date;
  originalEndTime: Date;
  newStartTime: Date;
  newEndTime: Date;
}) {
  if (!calendarSyncId) {
    throw new Error("Calendar sync ID is required");
  }
  // Verify booking times were updated
  const updatedBooking = await findBooking(bookingId);

  expect(updatedBooking).not.toBeNull();
  expect(updatedBooking?.status).toBe(BookingStatus.ACCEPTED);
  expect(updatedBooking?.rescheduledBy).toBe(rescheduledBy);

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

  const updatedCalendarSync = await findCalendarSync(calendarSyncId);
  expect(updatedCalendarSync).not.toBeNull();
  expect(updatedCalendarSync?.lastSyncDirection).toBe("DOWNSTREAM");
}

describe("Google Calendar Webhook Handler", () => {
  let req: NextApiRequest;
  // Set up mock request and response

  beforeEach(async () => {
    req = createMockReqRes();
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
    externalCalendarId = "johndoe@example.com",
    bookingStartTime = dayjs().add(1, "day").toDate(),
    bookingEndTime = dayjs().add(1, "day").add(30, "minutes").toDate(),
    providerSubscriptionId = "test-subscription-id",
    providerResourceId = "test-resource-id",
    bookingStatus = BookingStatus.ACCEPTED,
    options = {
      createCalendarSync: true,
      createSelectedCalendar: false,
    },
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
        uid: calendarEventId,
        bookingId: booking.id,
        meetingId: null,
        meetingPassword: null,
        meetingUrl: null,
        externalCalendarId,
        deleted: null,
      },
    });

    // Create calendar sync
    const calendarSync = options.createCalendarSync
      ? await prismock.calendarSync.create({
          data: {
            integration: "google_calendar",
            externalCalendarId,
            userId: user.id,
            credentialId: credential.id,
            bookingReferences: { connect: { id: bookingReference.id } },
          },
        })
      : null;

    const subscription = await prismock.calendarSubscription.create({
      data: {
        ...(calendarSync && {
          calendarSync: {
            connect: {
              id: calendarSync.id,
            },
          },
        }),
        providerSubscriptionId: providerSubscriptionId,
        providerResourceId: providerResourceId,
        providerSubscriptionKind: "test-kind",
        providerResourceUri: "test-resource-uri",
        providerExpiration: dayjs().add(1, "day").toDate(),
        status: "ACTIVE",
        externalCalendarId,
        providerType: "google_calendar",
        credentialId: credential.id,
      },
    });

    const selectedCalendar = options.createSelectedCalendar
      ? await prismock.selectedCalendar.create({
          data: {
            userId: user.id,
            externalId: externalCalendarId,
            credentialId: credential.id,
            googleChannelId: providerSubscriptionId,
            googleChannelKind: "test-kind",
            googleChannelResourceId: providerResourceId,
            googleChannelResourceUri: "test-resource-uri",
            googleChannelExpiration: dayjs().add(1, "day").toISOString(),
            integration: "google_calendar",
          },
        })
      : null;

    await prismock.feature.create({
      data: {
        slug: "calendar-cache",
        enabled: true,
      },
    });

    return { user, selectedCalendar, credential, booking, bookingReference, calendarSync, subscription };
  }

  it("should cancel a booking when Google Calendar event is cancelled", async () => {
    const calendarEventId = "google-event-1";
    const googleChannelId = "test-channel-id";
    const googleResourceId = "test-resource-id";

    // Set up test data
    const { booking: bookingToSync, calendarSync } = await setupTestData({
      calendarEventId,
      externalCalendarId: "johndoe@example.com",
      providerSubscriptionId: googleChannelId,
      providerResourceId: googleResourceId,
    });

    // Mock Google Calendar API to return the status of the event as cancelled
    calendarEventsListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: calendarEventId,
            status: "cancelled",
            start: { dateTime: dayjs().add(1, "day").toISOString() },
            end: { dateTime: dayjs().add(1, "day").add(30, "minutes").toISOString() },
          },
        ],
      },
    });

    const result = await webhookHandler({
      ...req,
      headers: {
        ...req.headers,
        "x-goog-channel-id": googleChannelId,
        "x-goog-resource-id": googleResourceId,
        "x-goog-resource-state": "exists",
      },
    } as unknown as NextApiRequest);
    // Call the webhook handler and expect it to resolve
    expect(result).toBeDefined();

    await expectBookingToBeCancelled({
      bookingId: bookingToSync.id,
      calendarSyncId: calendarSync?.id ?? null,
    });
  });

  // TODO: Enable this test when we enable support for time changes
  it.skip("should update booking times when Google Calendar event times change", async () => {
    const googleChannelId = "test-channel-id";
    const googleResourceId = "test-resource-id";
    const calendarEventId = "google-event-123";
    // Create booking with future time
    const { booking: bookingToSync, calendarSync } = await setupTestData({
      calendarEventId,
      externalCalendarId: "johndoe@example.com",
      providerSubscriptionId: googleChannelId,
      providerResourceId: googleResourceId,
    });

    // Original booking times
    const originalStartTime = bookingToSync.startTime;
    const originalEndTime = bookingToSync.endTime;

    // New times that will be returned from Google Calendar
    const newStartTime = dayjs().add(2, "day").toDate();
    const newEndTime = dayjs().add(2, "day").add(45, "minutes").toDate();

    // Mock Google Calendar API to return updated event times
    calendarEventsListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: calendarEventId,
            status: "confirmed",
            start: { dateTime: dayjs(newStartTime).toISOString() },
            end: { dateTime: dayjs(newEndTime).toISOString() },
          },
        ],
      },
    });

    const result = await webhookHandler({
      ...req,
      headers: {
        ...req.headers,
        "x-goog-channel-id": googleChannelId,
        "x-goog-resource-id": googleResourceId,
        "x-goog-resource-state": "exists",
      },
    } as unknown as NextApiRequest);

    expect(result).toBeDefined();

    await expectBookingToHaveBeenRescheduledAtTime({
      bookingId: bookingToSync.id,
      calendarSyncId: calendarSync?.id ?? null,
      rescheduledBy: "Google Calendar",
      originalStartTime,
      originalEndTime,
      newStartTime,
      newEndTime,
    });
  });

  it(`should update availability cache on "sync" resource state if selected calendar is there`, async () => {
    const googleChannelId = "test-channel-id";
    const googleResourceId = "test-resource-id";
    const calendarEventId = "google-event-123";

    // Create booking with future time
    await setupTestData({
      calendarEventId,
      externalCalendarId: "johndoe@example.com",
      providerSubscriptionId: googleChannelId,
      providerResourceId: googleResourceId,
      options: {
        createCalendarSync: false,
        createSelectedCalendar: true,
      },
    });

    freebusyQueryMock.mockResolvedValueOnce({
      data: {
        items: [],
      },
    });

    const result = await webhookHandler({
      ...req,
      headers: {
        ...req.headers,
        "x-goog-channel-id": googleChannelId,
        "x-goog-resource-id": googleResourceId,
        "x-goog-resource-state": "sync",
      },
    } as unknown as NextApiRequest);

    expect(result).toBeDefined();
    const calendarCache = await prismock.calendarCache.findMany();
    expect(calendarCache.length).toBe(1);
  });
});
