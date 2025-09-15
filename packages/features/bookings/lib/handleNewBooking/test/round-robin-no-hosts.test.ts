import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  mockCalendar,
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

import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking - Round Robin Host Validation", () => {
  setupAndTeardown();

  test(
    "should throw NoAvailableUsersFound when Round Robin event has both fixed and round robin hosts busy",
    async () => {
      const handleNewBooking = getNewBookingHandler();

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
            hosts: [
              {
                userId: 101,
                isFixed: true,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedulingType: SchedulingType.ROUND_ROBIN,
          },
        ],
        organizer: fixedHost,
        usersApartFromOrganizer: [roundRobinHost],
        bookings: [
          {
            userId: 101, // Make fixed host busy
            eventTypeId: 1,
            startTime: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
            endTime: `${getDate({ dateIncrement: 1 }).dateString}T04:45:00.000Z`,
            status: "ACCEPTED",
            attendees: [
              {
                email: "existing-booker@example.com",
                name: "Existing Booker",
              },
            ],
          },
          {
            userId: 102, // Make round robin host busy
            eventTypeId: 1,
            startTime: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
            endTime: `${getDate({ dateIncrement: 1 }).dateString}T04:45:00.000Z`,
            status: "ACCEPTED",
            attendees: [
              {
                email: "existing-booker2@example.com",
                name: "Existing Booker 2",
              },
            ],
          },
        ],
      });

      await createBookingScenario(scenarioData);

      mockCalendar("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [],
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
        })
      ).rejects.toThrow(ErrorCode.NoAvailableUsersFound);
    },
    timeout
  );

  test(
    "should throw RoundRobinHostsUnavailableForBooking when Round Robin event has fixed hosts but no round robin host is available",
    async () => {
      const handleNewBooking = getNewBookingHandler();

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
            hosts: [
              {
                userId: 101,
                isFixed: true,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedulingType: SchedulingType.ROUND_ROBIN,
          },
        ],
        organizer: fixedHost,
        usersApartFromOrganizer: [roundRobinHost],
        bookings: [
          {
            userId: 102, // Make round robin host busy with an existing booking
            eventTypeId: 1,
            startTime: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
            endTime: `${getDate({ dateIncrement: 1 }).dateString}T04:45:00.000Z`,
            status: "ACCEPTED",
            attendees: [
              {
                email: "existing-booker@example.com",
                name: "Existing Booker",
              },
            ],
          },
        ],
      });

      await createBookingScenario(scenarioData);

      mockCalendar("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [],
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
        })
      ).rejects.toThrow(ErrorCode.RoundRobinHostsUnavailableForBooking);
    },
    timeout
  );
});
