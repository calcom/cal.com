import {
  createBookingScenario,
  TestData,
  getGoogleCalendarCredential,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockCalendarToCrashOnGetAvailability,
  BookingLocations,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { describe, expect, vi } from "vitest";

import { prisma } from "@calcom/prisma";
import { WatchlistType, BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

const createTestWatchlistEntry = async (overrides: {
  type: WatchlistType;
  value: string;
  organizationId: number | null;
  action: "BLOCK" | "REPORT";
}) => {
  return prisma.watchlist.create({
    data: {
      type: overrides.type,
      value: overrides.value,
      action: overrides.action,
      createdById: 0,
      organizationId: overrides.organizationId,
      isGlobal: overrides.organizationId !== null ? false : true,
    },
  });
};

const createGlobalWatchlistEntry = async (overrides: {
  type: WatchlistType;
  value: string;
  action: "BLOCK" | "REPORT";
}) => {
  return createTestWatchlistEntry({
    type: overrides.type,
    value: overrides.value,
    action: overrides.action,
    organizationId: null,
  });
};

const expectDecoyBookingResponse = (booking: Record<string, unknown>) => {
  expect(booking).toHaveProperty("isShortCircuitedBooking", true);
  expect(booking).toHaveProperty("uid");
  expect(booking.uid).toBeTruthy();
  expect(booking).toHaveProperty("status", BookingStatus.ACCEPTED);
  expect(booking).toHaveProperty("id", 0);
};

const expectNoBookingInDatabase = async (bookerEmail: string) => {
  const bookings = await prisma.booking.findMany({
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

        await createGlobalWatchlistEntry({
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
        });

        console.log("watchlists", await prisma.watchlist.findMany());

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

    test(
      "should fail with there are no available users instead of returning decoy response because spam check happens in parallel with availability check",
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

        await createGlobalWatchlistEntry({
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
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

        await mockCalendarToCrashOnGetAvailability("googlecalendar");

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

        await expect(async () => {
          await handleNewBooking({
            bookingData: mockBookingData,
          });
        }).rejects.toThrow("no_available_users_found_error");
      },
      timeout
    );

    test(
      "should block booking when domain is in global watchlist and return decoy response",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedDomain = "globalspammydomain.com";
        const blockedEmail = `user@${blockedDomain}`;

        const booker = getBooker({
          email: blockedEmail,
          name: "Global Domain Blocked Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        await createGlobalWatchlistEntry({
          type: WatchlistType.DOMAIN,
          value: blockedDomain,
          action: "BLOCK",
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

    test(
      "should allow booking when spamCheckService.startCheck throws error (fail-open behavior)",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const bookerEmail = "failopen@example.com";

        const booker = getBooker({
          email: bookerEmail,
          name: "Fail Open Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
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

        // Mock the SpamCheckService to throw an error during isBlocked check
        const { getSpamCheckService } = await import(
          "@calcom/features/di/watchlist/containers/SpamCheckService.container"
        );
        const spamCheckService = getSpamCheckService();
        const originalIsBlocked = spamCheckService["isBlocked"].bind(spamCheckService);

        // Use vi.spyOn to mock the private method
        const isBlockedSpy = vi.spyOn(spamCheckService as never, "isBlocked");
        isBlockedSpy.mockRejectedValue(new Error("Database connection failed"));

        try {
          const createdBooking = await handleNewBooking({
            bookingData: mockBookingData,
          });

          // Should NOT be a decoy response - booking should succeed due to fail-open behavior
          expect(createdBooking).not.toHaveProperty("isShortCircuitedBooking");
          expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);
          expect(createdBooking.id).not.toBe(0);
          expect(createdBooking.attendees[0].email).toBe(bookerEmail);
        } finally {
          // Restore original implementation and clean up spy
          isBlockedSpy.mockRestore();
          spamCheckService["isBlocked"] = originalIsBlocked;
        }
      },
      timeout
    );
  });

});
