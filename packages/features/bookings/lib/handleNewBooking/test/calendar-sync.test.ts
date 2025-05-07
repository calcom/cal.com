import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getDate,
  getScenarioData,
  TestData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  getGoogleCalendarCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectCalendarSyncToBeInDatabase,
  expectBookingInDBToBeRescheduledFromTo,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe } from "vitest";
import { test } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { BookingStatus } from "@calcom/prisma/enums";

export type CustomNextApiRequest = NextApiRequest & Request;
export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking-Calendar Sync:", () => {
  setupAndTeardown();

  describe("Calendar Sync - New Booking:", () => {
    test(
      `should create a successful booking with mock calendar app and setup bidirectional sync
          1. Should create a booking in the database
          2. Should create a CalendarSync record with externalId of the eventType's destinationCalendar
          4. Should send emails to the booker as well as organizer
      `,
      async () => {
        const targetCalendar = {
          integration: "google_calendar",
          externalId: "google-calendar-id@example.com",
        };

        const credentialId = 101;
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [
            {
              ...getGoogleCalendarCredential(),
              id: credentialId,
            },
          ],
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
                destinationCalendar: {
                  credentialId,
                  integration: targetCalendar.integration,
                  externalId: targetCalendar.externalId,
                },
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"]],
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
        // Mock the calendar to return no busy slots
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "google-calendar-event-id",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        const { bookingReferences } = await expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
          references: [
            {
              type: appStoreMetadata.googlecalendar.type,
              uid: "google-calendar-event-id",
              externalCalendarId: targetCalendar.externalId,
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });

        const calendarReference = bookingReferences.find(
          (reference) => reference.type === appStoreMetadata.googlecalendar.type
        );

        if (!calendarReference) {
          throw new Error("Calendar reference not found");
        }

        // Check that CalendarSync record was created correctly
        await expectCalendarSyncToBeInDatabase({
          userId: organizer.id,
          credentialId,
          externalCalendarId: targetCalendar.externalId,
          integration: targetCalendar.integration,
          bookingReference: calendarReference,
        });
      },
      timeout
    );

    test(
      `should create a successful booking with mock calendar app and setup bidirectional sync
          1. Should create a booking in the database
          2. Should create a CalendarSync record with externalId from the CalendarService for the case when externalId isn't explicitly passed to CalendarService
          4. Should send emails to the booker as well as organizer
      `,
      async () => {
        const targetCalendar = {
          integration: "google_calendar",
          externalId: "google-calendar-id@example.com",
        };

        const credentialId = 101;
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [
            {
              ...getGoogleCalendarCredential(),
              id: credentialId,
            },
          ],
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
                // No destination Calendar is set, so CalendarService's externalCalendarId will be used
                // destinationCalendar: {
                //   credentialId,
                //   integration: targetCalendar.integration,
                //   externalId: targetCalendar.externalId,
                // },
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"]],
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
        // Mock the calendar to return no busy slots
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "google-calendar-event-id",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        const { bookingReferences } = await expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
          references: [
            {
              type: appStoreMetadata.googlecalendar.type,
              uid: "google-calendar-event-id",
              externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID_FALLBACK_BY_CALENDAR_SERVICE",
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });

        const calendarReference = bookingReferences.find(
          (reference) => reference.type === appStoreMetadata.googlecalendar.type
        );

        if (!calendarReference) {
          throw new Error("Calendar reference not found");
        }

        // Check that CalendarSync record was created correctly
        await expectCalendarSyncToBeInDatabase({
          userId: organizer.id,
          credentialId,
          externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID_FALLBACK_BY_CALENDAR_SERVICE",
          integration: targetCalendar.integration,
          bookingReference: calendarReference,
        });
      },
      timeout
    );
  });

  describe("Calendar Sync - Rescheduled Booking:", () => {
    test(
      `should reschedule a booking with google calendar app and setup bidirectional sync
          1. Should create a booking in the database
          2. Should create a CalendarSync record with externalId of the eventType's destinationCalendar
          4. Should send emails to the booker as well as organizer
      `,
      async () => {
        const targetCalendar = {
          integration: "google_calendar",
          externalId: "google-calendar-id@example.com",
        };
        const uidOfBookingToBeRescheduled = "UID_OF_BOOKING_TO_BE_RESCHEDULED";
        const credentialId = 101;
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [
            {
              ...getGoogleCalendarCredential(),
              id: credentialId,
            },
          ],
        });
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

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

                destinationCalendar: {
                  credentialId,
                  integration: targetCalendar.integration,
                  externalId: targetCalendar.externalId,
                },
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T05:00:00.000Z`,
                endTime: `${plus1DateString}T05:15:00.000Z`,
                references: [
                  {
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "ORIGINAL_BOOKING_REFERENCE_MEETING_UID",
                    meetingId: "ORIGINAL_BOOKING_REFERENCE_MEETING_ID",
                    meetingPassword: "ORIGINAL_BOOKING_REFERENCE_MEETING_PASSWORD",
                    meetingUrl: "ORIGINAL_BOOKING_REFERENCE_MEETING_URL",
                  },
                  {
                    type: appStoreMetadata.googlecalendar.type,
                    uid: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
                    externalCalendarId: targetCalendar.externalId,
                  },
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"]],
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
        // Mock the calendar to return no busy slots
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          // Calendar returns the same event but updated in reschedule
          update: {
            id: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            rescheduleUid: uidOfBookingToBeRescheduled,
            user: organizer.username,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        const { newBookingReferences, previousBookingReferences } =
          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              references: [
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
                  externalCalendarId: targetCalendar.externalId,
                },
              ],
            },
          });

        const newCalendarReference = newBookingReferences.find(
          (reference) => reference.type === appStoreMetadata.googlecalendar.type
        );

        if (!newCalendarReference) {
          throw new Error("Calendar reference not found");
        }

        // Check that CalendarSync record was created correctly
        await expectCalendarSyncToBeInDatabase({
          userId: organizer.id,
          credentialId,
          externalCalendarId: targetCalendar.externalId,
          integration: targetCalendar.integration,
          bookingReference: newCalendarReference,
        });
      },
      timeout
    );

    test(
      `should reschedule a booking with google calendar app and setup bidirectional sync
          1. Should create a booking in the database
          2. Should create a CalendarSync record with externalId from the previous booking's BookingReference if it was set
          4. Should send emails to the booker as well as organizer
      `,
      async () => {
        const targetCalendar = {
          integration: "google_calendar",
        };
        const uidOfBookingToBeRescheduled = "UID_OF_BOOKING_TO_BE_RESCHEDULED";
        const credentialId = 101;
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [
            {
              ...getGoogleCalendarCredential(),
              id: credentialId,
            },
          ],
        });
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

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
                // destinationCalendar: {
                //   credentialId,
                //   integration: targetCalendar.integration,
                //   externalId: targetCalendar.externalId,
                // },
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T05:00:00.000Z`,
                endTime: `${plus1DateString}T05:15:00.000Z`,
                references: [
                  {
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "ORIGINAL_BOOKING_REFERENCE_MEETING_UID",
                    meetingId: "ORIGINAL_BOOKING_REFERENCE_MEETING_ID",
                    meetingPassword: "ORIGINAL_BOOKING_REFERENCE_MEETING_PASSWORD",
                    meetingUrl: "ORIGINAL_BOOKING_REFERENCE_MEETING_URL",
                  },
                  {
                    uid: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
                    type: appStoreMetadata.googlecalendar.type,
                    externalCalendarId: "john@example.com",
                  },
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"]],
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
        // Mock the calendar to return no busy slots
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          // Calendar returns the same event but updated in reschedule
          update: {
            id: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            rescheduleUid: uidOfBookingToBeRescheduled,
            user: organizer.username,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        const { newBookingReferences, previousBookingReferences } =
          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              references: [
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
                  externalCalendarId: "john@example.com",
                },
              ],
            },
          });

        const newCalendarReference = newBookingReferences?.find(
          (reference) => reference.type === appStoreMetadata.googlecalendar.type
        );

        if (!newCalendarReference) {
          throw new Error("Calendar reference not found");
        }

        // Check that CalendarSync record was created correctly
        await expectCalendarSyncToBeInDatabase({
          userId: organizer.id,
          credentialId,
          externalCalendarId: "john@example.com",
          integration: targetCalendar.integration,
          bookingReference: newCalendarReference,
        });
      },
      timeout
    );

    test(
      `should reschedule a booking with google calendar app and setup bidirectional sync
          1. Should create a booking in the database
          2. Should create a CalendarSync record with externalId from the previous booking's BookingReference if not set
          4. Should send emails to the booker as well as organizer
      `,
      async () => {
        const targetCalendar = {
          integration: "google_calendar",
        };
        const uidOfBookingToBeRescheduled = "UID_OF_BOOKING_TO_BE_RESCHEDULED";
        const credentialId = 101;
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [
            {
              ...getGoogleCalendarCredential(),
              id: credentialId,
            },
          ],
        });
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

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
                // destinationCalendar: {
                //   credentialId,
                //   integration: targetCalendar.integration,
                //   externalId: targetCalendar.externalId,
                // },
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T05:00:00.000Z`,
                endTime: `${plus1DateString}T05:15:00.000Z`,
                references: [
                  {
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "ORIGINAL_BOOKING_REFERENCE_MEETING_UID",
                    meetingId: "ORIGINAL_BOOKING_REFERENCE_MEETING_ID",
                    meetingPassword: "ORIGINAL_BOOKING_REFERENCE_MEETING_PASSWORD",
                    meetingUrl: "ORIGINAL_BOOKING_REFERENCE_MEETING_URL",
                  },
                  {
                    uid: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
                    type: appStoreMetadata.googlecalendar.type,
                    externalCalendarId: null,
                  },
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"]],
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
        // Mock the calendar to return no busy slots
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          // Calendar returns the same event but updated in reschedule
          update: {
            id: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            rescheduleUid: uidOfBookingToBeRescheduled,
            user: organizer.username,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        const { newBookingReferences, previousBookingReferences } =
          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              references: [
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
                  externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID_FALLBACK_BY_CALENDAR_SERVICE",
                },
              ],
            },
          });

        const newCalendarReference = newBookingReferences?.find(
          (reference) => reference.type === appStoreMetadata.googlecalendar.type
        );

        if (!newCalendarReference) {
          throw new Error("Calendar reference not found");
        }

        // Check that CalendarSync record was created correctly
        await expectCalendarSyncToBeInDatabase({
          userId: organizer.id,
          credentialId,
          externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID_FALLBACK_BY_CALENDAR_SERVICE",
          integration: targetCalendar.integration,
          bookingReference: newCalendarReference,
        });
      },
      timeout
    );
  });
});
