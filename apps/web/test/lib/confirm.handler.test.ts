import {
  createBookingScenario,
  getOrganizer,
  getScenarioData,
  TestData,
  mockSuccessfulVideoMeetingCreation,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, it, beforeEach, vi, expect } from "vitest";

import * as handleConfirmationModule from "@calcom/features/bookings/lib/handleConfirmation";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { confirmHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload");

describe("confirmHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass hideCalendarNotes property to CalendarEvent when enabled", async () => {
    vi.setSystemTime("2050-01-07T00:00:00Z");

    const handleConfirmationSpy = vi.spyOn(handleConfirmationModule, "handleConfirmation");

    const attendeeUser = getOrganizer({
      email: "test@example.com",
      name: "test name",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const uidOfBooking = "hideNotes123";
    const iCalUID = `${uidOfBooking}@Cal.com`;

    const plus1DateString = "2050-01-08";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 15,
            length: 15,
            locations: [],
            hideCalendarNotes: true,
            hideCalendarEventDetails: true,
            requiresConfirmation: true,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: 101,
            uid: uidOfBooking,
            eventTypeId: 1,
            status: BookingStatus.PENDING,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:15:00.000Z`,
            references: [],
            iCalUID,
            location: "integrations:daily",
            attendees: [attendeeUser],
            responses: { name: attendeeUser.name, email: attendeeUser.email, notes: "Sensitive information" },
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
    });

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
        timeZone: organizer.timeZone,
        username: organizer.username,
      } as NonNullable<TrpcSessionUser>,
    };

    const res = await confirmHandler({
      ctx,
      input: { bookingId: 101, confirmed: true, reason: "", emailsEnabled: true },
    });

    expect(res?.status).toBe(BookingStatus.ACCEPTED);
    expect(handleConfirmationSpy).toHaveBeenCalledTimes(1);

    const handleConfirmationCall = handleConfirmationSpy.mock.calls[0][0];
    const calendarEvent = handleConfirmationCall.evt;

    expect(calendarEvent.hideCalendarNotes).toBe(true);
    expect(calendarEvent.hideCalendarEventDetails).toBe(true);
  });

  it("should preserve custom metadata from evt and merge with videoCallUrl", async () => {
    vi.setSystemTime("2050-01-07T00:00:00Z");

    const originalHandleConfirmation = handleConfirmationModule.handleConfirmation;
    const handleConfirmationSpy = vi.spyOn(handleConfirmationModule, "handleConfirmation");
    const sendPayloadMock = vi.mocked(sendPayload);

    const attendeeUser = getOrganizer({
      email: "test@example.com",
      name: "test name",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      webhooks: [
        {
          id: "webhook-1",
          subscriberUrl: "http://my-webhook.example.com",
          eventTriggers: ["BOOKING_CREATED"],
          appId: null,
          secret: "secret",
        },
      ],
    });

    const uidOfBooking = "customMetadata123";
    const iCalUID = `${uidOfBooking}@Cal.com`;
    const plus1DateString = "2050-01-08";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 15,
            length: 15,
            locations: [],
            requiresConfirmation: true,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: 101,
            uid: uidOfBooking,
            eventTypeId: 1,
            status: BookingStatus.PENDING,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:15:00.000Z`,
            references: [],
            iCalUID,
            location: "integrations:daily",
            attendees: [attendeeUser],
            responses: { name: attendeeUser.name, email: attendeeUser.email },
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
    });

    // Mock handleConfirmation to inject custom metadata into evt
    handleConfirmationSpy.mockImplementation(async (originalParams) => {
      // Add custom metadata to evt before calling original function
      const modifiedParams = {
        ...originalParams,
        evt: {
          ...originalParams.evt,
          metadata: {
            customField: "custom-value",
          },
        },
      };

      // Call the real implementation with modified params
      return originalHandleConfirmation(modifiedParams);
    });

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
        timeZone: organizer.timeZone,
        username: organizer.username,
      } as NonNullable<TrpcSessionUser>,
    };

    await confirmHandler({
      ctx,
      input: { bookingId: 101, confirmed: true, reason: "", emailsEnabled: true },
    });

    expect(handleConfirmationSpy).toHaveBeenCalledTimes(1);

    // Verify webhook was called with BOOKING_CREATED event
    expect(sendPayloadMock).toHaveBeenCalledWith(
      expect.any(String), // secret
      WebhookTriggerEvents.BOOKING_CREATED,
      expect.any(String), // createdAt
      expect.any(Object), // subscriber
      expect.objectContaining({
        metadata: expect.objectContaining({
          // Should contain custom metadata from evt
          customField: "custom-value",
          // Should also contain videoCallUrl from meeting creation
          videoCallUrl: expect.any(String),
        }),
      })
    );

    // Get the actual payload sent to webhook
    const webhookCall = sendPayloadMock.mock.calls.find(
      call => call[1] === WebhookTriggerEvents.BOOKING_CREATED
    );
    expect(webhookCall).toBeDefined();

    if (webhookCall) {
      const payload = webhookCall[4];
      // Verify all metadata is preserved and merged correctly
      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.customField).toBe("custom-value");
      expect(payload.metadata.videoCallUrl).toBeDefined();
      expect(typeof payload.metadata.videoCallUrl).toBe('string');
    }
  });
});
