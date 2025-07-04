import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  TestData,
  Timezones,
  getDate,
  getGoogleCalendarCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { SchedulingType } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking - Round Robin Host Validation", () => {
  setupAndTeardown();

  test(
    "should throw NoAvailableUsersFound when Round Robin event has fixed hosts available but no Round Robin hosts available",
    async () => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const fixedHost = getOrganizer({
        name: "Fixed Host",
        email: "fixed-host@example.com",
        id: 101,
        schedules: [TestData.schedules.IstMorningShift],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const roundRobinHost = {
        name: "Round Robin Host",
        username: "round-robin-host",
        timeZone: Timezones["+5:30"],
        email: "round-robin-host@example.com",
        id: 102,
        schedules: [TestData.schedules.IstMorningShift],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      };

      const scenarioData = getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [
              {
                ...fixedHost,
                isFixed: true,
              },
              {
                ...roundRobinHost,
                isFixed: false,
              },
            ],
            schedulingType: SchedulingType.ROUND_ROBIN,
          },
        ],
        organizer: fixedHost,
        usersApartFromOrganizer: [roundRobinHost],
      });

      await createBookingScenario(scenarioData);

      mockCalendarToHaveNoBusySlots("round-robin-host@google-calendar.com", {
        create: {
          [`${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`]: {
            start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
            end: `${getDate({ dateIncrement: 1 }).dateString}T04:45:00.000Z`,
          },
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T04:45:00.000Z`,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "integrations:daily" },
          },
        },
      });

      await expect(
        handleNewBooking({
          bookingData: mockBookingData,
          userId: booker.id,
        })
      ).rejects.toThrow(ErrorCode.NoAvailableUsersFound);
    },
    timeout
  );
});
