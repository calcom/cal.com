import { describe } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
  getDate,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import { expectBookingCancelledWebhookToHaveBeenFired } from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

describe("Cancel Booking", () => {
  setupAndTeardown();

  test("Should trigger BOOKING_CANCELLED webhook", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "h5Wv3eHgconAED2j4gcVhP";
    const idOfBookingToBeCancelled = 1020;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        webhooks: [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CANCELLED"],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ],
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:15:00.000Z`,
            metadata: {
              videoCallUrl: "https://existing-daily-video-call-url.example.com",
            },
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );
    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-1`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
      },
    });

    const { req } = createMockNextJsRequest({
      method: "POST",
      body: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
      },
    });

    await handleCancelBooking(req);

    expectBookingCancelledWebhookToHaveBeenFired({
      booker,
      organizer,
      location: BookingLocations.CalVideo,
      subscriberUrl: "http://my-webhook.example.com",
      payload: {
        organizer: {
          id: organizer.id,
          username: organizer.username,
          email: organizer.email,
          name: organizer.name,
          timeZone: organizer.timeZone,
        },
      },
    });
  });
});
