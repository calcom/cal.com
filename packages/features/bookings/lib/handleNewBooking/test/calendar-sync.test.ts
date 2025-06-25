import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getDate,
  getScenarioData,
  createOrganization,
  TestData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  getGoogleCalendarCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { expectTaskToBeCreated } from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, test, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { MembershipRole } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";

export type CustomNextApiRequest = NextApiRequest & Request;
export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

async function createOrganizationAndEnableCalendarSyncFeature() {
  const org = await createOrganization({
    name: "Test Org",
    slug: "testorg",
  });

  const payloadToMakePartOfOrganization = [
    {
      membership: {
        accepted: true,
        role: MembershipRole.ADMIN,
      },
      team: {
        id: org.id,
        name: "Test Org",
        slug: "testorg",
      },
    },
  ];

  await prismock.teamFeatures.create({
    data: {
      teamId: org.id,
      featureId: "calendar-sync",
    },
  });

  return { payloadToMakePartOfOrganization, org };
}

describe("handleNewBooking-Calendar Sync:", () => {
  setupAndTeardown();

  describe("Calendar Sync - New Booking:", () => {
    test(
      `should create a 'createCalendarSync' task with externalId of the eventType's destinationCalendar`,
      async () => {
        const { payloadToMakePartOfOrganization } = await createOrganizationAndEnableCalendarSyncFeature();

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
          teams: payloadToMakePartOfOrganization,
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

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        await expectTaskToBeCreated({
          taskType: "createCalendarSync",
          taskPayload: {
            calendarEventId: "google-calendar-event-id",
            calendarSyncData: expect.objectContaining({
              userId: organizer.id,
              credentialId,
              externalCalendarId: targetCalendar.externalId,
              integration: targetCalendar.integration,
            }),
          },
        });
      },
      timeout
    );

    test(
      `should create a 'createCalendarSync' task with externalId from the CalendarService for the case when externalId isn't explicitly passed to CalendarService`,
      async () => {
        const { payloadToMakePartOfOrganization } = await createOrganizationAndEnableCalendarSyncFeature();

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
          teams: payloadToMakePartOfOrganization,
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

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        await expectTaskToBeCreated({
          taskType: "createCalendarSync",
          taskPayload: {
            calendarEventId: "google-calendar-event-id",
            calendarSyncData: expect.objectContaining({
              userId: organizer.id,
              credentialId,
              externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID_FALLBACK_BY_CALENDAR_SERVICE",
              integration: targetCalendar.integration,
            }),
          },
        });
      },
      timeout
    );
  });

  describe("Calendar Sync - Rescheduled Booking:", () => {
    test(
      `should create a 'createCalendarSync' task with externalId of the eventType's destinationCalendar`,
      async () => {
        const { payloadToMakePartOfOrganization } = await createOrganizationAndEnableCalendarSyncFeature();
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
          teams: payloadToMakePartOfOrganization,
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

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        // Check that CalendarSync record was created correctly
        await expectTaskToBeCreated({
          taskType: "createCalendarSync",
          taskPayload: {
            calendarEventId: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
            calendarSyncData: expect.objectContaining({
              userId: organizer.id,
              credentialId,
              externalCalendarId: targetCalendar.externalId,
              integration: targetCalendar.integration,
            }),
          },
        });
      },
      timeout
    );

    test(
      `should create a 'createCalendarSync' task with externalId from the previous booking's BookingReference if it was set`,
      async () => {
        const { payloadToMakePartOfOrganization } = await createOrganizationAndEnableCalendarSyncFeature();
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
          teams: payloadToMakePartOfOrganization,
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

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        // Check that CalendarSync record was created correctly
        await expectTaskToBeCreated({
          taskType: "createCalendarSync",
          taskPayload: {
            calendarEventId: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
            calendarSyncData: expect.objectContaining({
              userId: organizer.id,
              credentialId,
              externalCalendarId: "john@example.com",
              integration: targetCalendar.integration,
            }),
          },
        });
      },
      timeout
    );

    test(
      `should create a 'createCalendarSync' task with fallback externalId when previous booking's BookingReference externalCalendarId is null`,
      async () => {
        const { payloadToMakePartOfOrganization } = await createOrganizationAndEnableCalendarSyncFeature();
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
          teams: payloadToMakePartOfOrganization,
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

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        // Check that CalendarSync record was created correctly
        await expectTaskToBeCreated({
          taskType: "createCalendarSync",
          taskPayload: {
            calendarEventId: "ORIGINAL_BOOKING_REFERENCE_CALENDAR_EVENT_ID",
            calendarSyncData: expect.objectContaining({
              userId: organizer.id,
              credentialId,
              externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID_FALLBACK_BY_CALENDAR_SERVICE",
              integration: targetCalendar.integration,
            }),
          },
        });
      },
      timeout
    );
  });
});
