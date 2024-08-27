import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  getDate,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, beforeEach, vi, expect } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
import { confirmHandler } from "./confirm.handler";

describe("confirmHandler", () => {
  setupAndTeardown();
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should successfully confirm booking", async () => {
    const attendeeUser = getOrganizer({
      email: "test@example.com",
      name: "test name",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
    const iCalUID = `${uidOfBookingToBeRescheduled}@Cal.com`;

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
            location: null,
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
            uid: uidOfBookingToBeRescheduled,
            eventTypeId: 1,
            status: BookingStatus.PENDING,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:15:00.000Z`,
            references: [],
            iCalUID,
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
        ...organizer,
      } as NonNullable<TrpcSessionUser>,
    };

    const res = await confirmHandler({
      ctx,
      input: { bookingId: 101, confirmed: true, reason: "" },
    });

    expect(res.status).toBe(BookingStatus.ACCEPTED);
  });
});
