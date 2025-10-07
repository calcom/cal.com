import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  TestData,
  getGoogleCalendarCredential,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  BookingLocations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect } from "vitest";

import { WatchlistType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

const createTestWatchlistEntry = async (overrides?: {
  type?: WatchlistType;
  value?: string;
  organizationId?: number | null;
  action?: "BLOCK" | "REPORT";
}) => {
  const timestamp = Date.now();
  return prismaMock.watchlist.create({
    data: {
      type: overrides?.type || WatchlistType.EMAIL,
      value: overrides?.value || `blocked-${timestamp}@example.com`,
      action: overrides?.action || "BLOCK",
      createdById: 0,
      organizationId: overrides?.organizationId !== undefined ? overrides.organizationId : null,
    },
  });
};

const expectDecoyBookingResponse = (booking: Record<string, unknown>) => {
  expect(booking).toHaveProperty("isSpamDecoy", true);
  expect(booking).toHaveProperty("uid");
  expect(booking.uid).toBeTruthy();
  expect(booking).toHaveProperty("status", BookingStatus.ACCEPTED);
  expect(booking).toHaveProperty("id", 0);
};

const expectNoBookingInDatabase = async (bookerEmail: string) => {
  const bookings = await prismaMock.booking.findMany({
    where: {
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
  });
  expect(bookings).toHaveLength(0);
};

describe("handleNewBooking - Spam Detection", () => {
  setupAndTeardown();

  describe("Global Watchlist Blocking:", () => {
    test(
      "should block booking when email is in global watchlist and return decoy response",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedEmail = "spammer@example.com";
        
        const booker = getBooker({
          email: blockedEmail,
          name: "Blocked Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        await createTestWatchlistEntry({
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          organizationId: null,
        });

        await createBookingScenario(
          getScenarioData({
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
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
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

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        expectDecoyBookingResponse(createdBooking);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
        await expectNoBookingInDatabase(blockedEmail);
      },
      timeout
    );
  });
});