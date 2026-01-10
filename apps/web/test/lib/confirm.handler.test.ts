import {
  createBookingScenario,
  getOrganizer,
  getScenarioData,
  TestData,
  mockSuccessfulVideoMeetingCreation,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, it, beforeEach, vi, expect } from "vitest";

import * as handleConfirmationModule from "@calcom/features/bookings/lib/handleConfirmation";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import { BookingStatus } from "@calcom/prisma/enums";
import { confirmHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

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
            user: { id: organizer.id },
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
      traceContext: distributedTracing.createTrace("test_confirm_handler"),
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
});
