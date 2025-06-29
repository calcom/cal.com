import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  TestData,
  getBooker,
  mockCalendarToHaveNoBusySlots,
  Timezones,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulCalendarEventCreationInCalendar,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect } from "vitest";

import { SchedulingType, BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("Collective Events - Destination Calendars Issue #21872", () => {
  setupAndTeardown();

  test(
    "should include all hosts' destination calendars when rescheduling a collective event with newly added host",
    async ({ emails }) => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const host1 = getOrganizer({
        name: "Host 1",
        email: "host1@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: "google_calendar",
          externalId: "host1@google-calendar.com",
          primaryEmail: "host1@example.com",
        },
      });

      const host2 = {
        name: "Host 2",
        username: "host2",
        email: "host2@example.com",
        id: 102,
        timeZone: Timezones["+5:30"],
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "host2@google-calendar.com",
        },
      };

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.COLLECTIVE,
              users: [{ id: 101 }, { id: 102 }],
            },
          ],
          bookings: [
            {
              uid: "original-booking-uid",
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
              attendees: [{ email: booker.email }],
              // Original booking only had calendar reference for host1
              references: [
                {
                  type: "google_calendar",
                  uid: "ORIGINAL_CAL_EVENT_UID",
                  meetingId: "ORIGINAL_CAL_EVENT_UID",
                  meetingPassword: "",
                  meetingUrl: "",
                  externalCalendarId: "host1@google-calendar.com",
                  credentialId: 1,
                },
              ],
            },
          ],
          organizer: host1,
          usersApartFromOrganizer: [host2],
          apps: [TestData.apps["google-calendar"]],
        })
      );

      const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          uid: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockRescheduleData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          rescheduleUid: "original-booking-uid",
          start: `${plus2DateString}T06:00:00.000Z`,
          end: `${plus2DateString}T06:30:00.000Z`,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "New York" },
          },
        },
      });

      const rescheduledBooking = await handleNewBooking({
        bookingData: mockRescheduleData,
      });

      expect(rescheduledBooking).toEqual(
        expect.objectContaining({
          startTime: new Date(`${plus2DateString}T06:00:00.000Z`),
          endTime: new Date(`${plus2DateString}T06:30:00.000Z`),
        })
      );

      await expectBookingToBeInDatabase({
        description: "",
        uid: rescheduledBooking.uid!,
        eventTypeId: mockRescheduleData.eventTypeId,
        status: BookingStatus.ACCEPTED,
      });

      expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
        destinationCalendars: [
          {
            integration: "google_calendar",
            externalId: "host1@google-calendar.com",
          },
          {
            integration: "google_calendar",
            externalId: "host2@google-calendar.com",
          },
        ],
        videoCallUrl: null,
      });

      expect(rescheduledBooking).toEqual(
        expect.objectContaining({
          startTime: new Date(`${plus2DateString}T06:00:00.000Z`),
          endTime: new Date(`${plus2DateString}T06:30:00.000Z`),
        })
      );
    },
    timeout
  );

  test(
    "should handle rescheduling when original booking has single host but event type now has multiple hosts",
    async ({ emails }) => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const host1 = getOrganizer({
        name: "Host 1",
        email: "host1@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: "google_calendar",
          externalId: "host1@google-calendar.com",
          primaryEmail: "host1@example.com",
        },
      });

      const host2 = {
        name: "Host 2",
        username: "host2",
        email: "host2@example.com",
        id: 102,
        timeZone: Timezones["+5:30"],
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "host2@google-calendar.com",
        },
      };

      const host3 = {
        name: "Host 3",
        username: "host3",
        email: "host3@example.com",
        id: 103,
        timeZone: Timezones["+5:30"],
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "host3@google-calendar.com",
        },
      };

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.COLLECTIVE,
              users: [
                {
                  id: 101,
                },
                {
                  id: 102,
                },
                {
                  id: 103,
                },
              ],
            },
          ],
          bookings: [
            {
              uid: "original-booking-uid-2",
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
              attendees: [
                {
                  email: booker.email,
                },
              ],
              // Original booking only had calendar reference for host1
              references: [
                {
                  type: "google_calendar",
                  uid: "ORIGINAL_CAL_EVENT_UID_2",
                  meetingId: "ORIGINAL_CAL_EVENT_UID_2",
                  meetingPassword: "",
                  meetingUrl: "",
                  externalCalendarId: "host1@google-calendar.com",
                  credentialId: 1,
                },
              ],
            },
          ],
          organizer: host1,
          usersApartFromOrganizer: [host2, host3],
          apps: [TestData.apps["google-calendar"]],
        })
      );

      // Mock calendar service
      const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          uid: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockRescheduleData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          rescheduleUid: "original-booking-uid-2",
          start: `${plus2DateString}T07:00:00.000Z`,
          end: `${plus2DateString}T07:30:00.000Z`,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "Conference Room" },
          },
        },
      });

      const rescheduledBooking = await handleNewBooking({
        bookingData: mockRescheduleData,
      });

      // Verify the booking was rescheduled successfully
      expect(rescheduledBooking).toEqual(
        expect.objectContaining({
          startTime: new Date(`${plus2DateString}T07:00:00.000Z`),
          endTime: new Date(`${plus2DateString}T07:30:00.000Z`),
        })
      );

      // Verify the booking was created in the database
      await expectBookingToBeInDatabase({
        description: "",
        uid: rescheduledBooking.uid!,
        eventTypeId: mockRescheduleData.eventTypeId,
        status: BookingStatus.ACCEPTED,
      });

      expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
        destinationCalendars: [
          {
            integration: "google_calendar",
            externalId: "host1@google-calendar.com",
          },
          {
            integration: "google_calendar",
            externalId: "host2@google-calendar.com",
          },
          {
            integration: "google_calendar",
            externalId: "host3@google-calendar.com",
          },
        ],
        videoCallUrl: null,
      });

      expect(rescheduledBooking).toEqual(
        expect.objectContaining({
          startTime: new Date(`${plus2DateString}T07:00:00.000Z`),
          endTime: new Date(`${plus2DateString}T07:30:00.000Z`),
        })
      );
    },
    timeout
  );

  test(
    "should handle collective events with mixed calendar integrations",
    async ({ emails }) => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const host1 = getOrganizer({
        name: "Host 1",
        email: "host1@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: "google_calendar",
          externalId: "host1@google-calendar.com",
          primaryEmail: "host1@example.com",
        },
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.COLLECTIVE,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          organizer: host1,
          apps: [TestData.apps["google-calendar"]],
        })
      );

      const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          uid: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          start: `${plus1DateString}T08:00:00.000Z`,
          end: `${plus1DateString}T08:30:00.000Z`,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "Video Call" },
          },
        },
      });

      const newBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      // Verify the booking was created successfully
      expect(newBooking).toEqual(
        expect.objectContaining({
          startTime: new Date(`${plus1DateString}T08:00:00.000Z`),
          endTime: new Date(`${plus1DateString}T08:30:00.000Z`),
        })
      );

      // Verify the booking was created in the database
      await expectBookingToBeInDatabase({
        description: "",
        uid: newBooking.uid!,
        eventTypeId: mockBookingData.eventTypeId,
        status: BookingStatus.ACCEPTED,
      });

      // Calendar should be called once for the single host
      expect(calendarMock.createEventCalls.length).toBe(1);
    },
    timeout
  );
});
