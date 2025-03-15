/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: Bring this test back with the correct setup (no illegal imports)
import { describe, it, beforeEach, vi, expect } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import { confirmHandler } from "./confirm.handler";

describe.skip("confirmHandler", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should successfully confirm booking when event type doesn't have any default location", async () => {
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

    const uidOfBooking = "n5Wv3eHgconAED2j4gcVhP";
    const iCalUID = `${uidOfBooking}@Cal.com`;

    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        webhooks: [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CREATED"],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ],
        eventTypes: [
          {
            id: 1,
            slotInterval: 15,
            length: 15,
            locations: [],
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
            responses: { name: attendeeUser.name, email: attendeeUser.email, guests: [] },
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
      input: { bookingId: 101, confirmed: true, reason: "" },
    });

    expect(res?.status).toBe(BookingStatus.ACCEPTED);
  });
});
