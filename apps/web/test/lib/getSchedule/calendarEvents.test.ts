import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  mockCalendar,
  TestData,
  Timezones,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { describe, test } from "vitest";
import { expect, expectedSlotsForSchedule } from "./expects";
import { setupAndTeardown } from "./setupAndTeardown";

describe("getSchedule", () => {
  const availableSlotsService = getAvailableSlotsService();
  setupAndTeardown();
  describe("Calendar event", () => {
    test("correctly identifies unavailable slots from selected calendars at user level", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const useEventLevelSelectedCalendars = false;

      mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [
          {
            start: `${plus2DateString}T04:45:00.000Z`,
            end: `${plus2DateString}T23:00:00.000Z`,
          },
        ],
      });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            useEventLevelSelectedCalendars,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps["google-calendar"]],
      };
      // An event with one accepted booking
      await createBookingScenario(scenarioData);

      const scheduleForDayWithAGoogleCalendarBooking = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
      expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots([`04:00:00.000Z`], {
        dateString: plus2DateString,
      });
    });

    describe("useEventLevelSelectedCalendars is true", () => {
      test("correctly identifies unavailable slots from selected calendars at event level", async () => {
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
        const useEventLevelSelectedCalendars = true;
        const eventTypeId = 1;
        mockCalendar("googlecalendar", {
          create: {
            uid: "MOCK_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
          busySlots: [
            {
              start: `${plus2DateString}T04:45:00.000Z`,
              end: `${plus2DateString}T23:00:00.000Z`,
            },
          ],
        });

        const scenarioData = {
          eventTypes: [
            {
              id: 1,
              useEventLevelSelectedCalendars,
              slotInterval: 45,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          users: [
            {
              ...TestData.users.example,
              id: 101,
              schedules: [TestData.schedules.IstWorkHours],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [
                {
                  ...TestData.selectedCalendars.google,
                  eventTypeId,
                },
              ],
            },
          ],
          apps: [TestData.apps["google-calendar"]],
        };
        // An event with one accepted booking
        await createBookingScenario(scenarioData);

        const scheduleForDayWithAGoogleCalendarBooking = await availableSlotsService.getAvailableSlots({
          input: {
            eventTypeId,
            eventTypeSlug: "",
            startTime: `${plus1DateString}T18:30:00.000Z`,
            endTime: `${plus2DateString}T18:29:59.999Z`,
            timeZone: Timezones["+5:30"],
            isTeamEvent: false,
            orgSlug: null,
          },
        });

        // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
        expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots([`04:00:00.000Z`], {
          dateString: plus2DateString,
        });
      });

      test("doesn't consider user level selected calendars", async () => {
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
        const useEventLevelSelectedCalendars = true;
        const eventTypeId = 1;
        mockCalendar("googlecalendar", {
          create: {
            uid: "MOCK_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
          busySlots: [
            {
              start: `${plus2DateString}T04:45:00.000Z`,
              end: `${plus2DateString}T23:00:00.000Z`,
            },
          ],
        });

        const scenarioData = {
          eventTypes: [
            {
              id: 1,
              useEventLevelSelectedCalendars,
              slotInterval: 60,
              length: 60,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          users: [
            {
              ...TestData.users.example,
              id: 101,
              schedules: [TestData.schedules.IstWorkHours],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [
                {
                  ...TestData.selectedCalendars.google,
                  eventTypeId: null,
                },
              ],
            },
          ],
          apps: [TestData.apps["google-calendar"]],
        };
        // An event with one accepted booking
        await createBookingScenario(scenarioData);

        const scheduleForDayWithAGoogleCalendarBooking = await availableSlotsService.getAvailableSlots({
          input: {
            eventTypeId,
            eventTypeSlug: "",
            startTime: `${plus1DateString}T18:30:00.000Z`,
            endTime: `${plus2DateString}T18:29:59.999Z`,
            timeZone: Timezones["+5:30"],
            isTeamEvent: false,
            orgSlug: null,
          },
        });

        // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
        expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus2DateString,
          }
        );
      });

      test("doesnt consider another event type's selected calendars", async () => {
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
        const useEventLevelSelectedCalendars = true;
        const eventTypeId = 1;
        const anotherEventTypeId = 2;
        mockCalendar("googlecalendar", {
          create: {
            uid: "MOCK_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
          busySlots: [
            {
              start: `${plus2DateString}T04:45:00.000Z`,
              end: `${plus2DateString}T23:00:00.000Z`,
            },
          ],
        });

        const scenarioData = {
          eventTypes: [
            {
              id: eventTypeId,
              useEventLevelSelectedCalendars,
              slotInterval: 60,
              length: 60,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          users: [
            {
              ...TestData.users.example,
              id: 101,
              schedules: [TestData.schedules.IstWorkHours],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [
                {
                  ...TestData.selectedCalendars.google,
                  eventTypeId: anotherEventTypeId,
                },
              ],
            },
          ],
          apps: [TestData.apps["google-calendar"]],
        };
        // An event with one accepted booking
        await createBookingScenario(scenarioData);

        const scheduleForDayWithAGoogleCalendarBooking = await availableSlotsService.getAvailableSlots({
          input: {
            eventTypeId,
            eventTypeSlug: "",
            startTime: `${plus1DateString}T18:30:00.000Z`,
            endTime: `${plus2DateString}T18:29:59.999Z`,
            timeZone: Timezones["+5:30"],
            isTeamEvent: false,
            orgSlug: null,
          },
        });

        // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
        expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus2DateString,
          }
        );
      });
    });
  });
});
