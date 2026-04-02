import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { resetTestEmails } from "@calcom/lib/testEmails";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { expectBookingToBeInDatabase } from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect } from "vitest";
import { getNewBookingHandler } from "../getNewBookingHandler";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;

const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetTestEmails();
  });

  describe("Collective Event Reschedule with Destination Calendar Bug", () => {
    test(
      `should reschedule a collective event booking and ensure both hosts have the booking in their calendars when a second host is added
        1. Create a collective event with 1 host and book it
        2. Add a second host to the event type
        3. Reschedule the booking
        4. Verify both hosts have the booking in their calendars
    `,
      async ({ emails }) => {
        const handleNewBooking = getNewBookingHandler();

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
          destinationCalendar: {
            integration: "google_calendar",
            externalId: "organizer@google-calendar.com",
            primaryEmail: "organizer@google-calendar.com",
          },
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
        const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
        const iCalUID = `${uidOfBookingToBeRescheduled}@Cal.com`;

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 15,
                length: 30,
                schedulingType: SchedulingType.COLLECTIVE,
                users: [
                  {
                    id: 101, // organizer
                  },
                  {
                    id: 102, // second host (will be added to event type)
                  },
                ],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                  primaryEmail: "event-type-1@google-calendar.com",
                },
              },
            ],
            users: [
              {
                id: 101,
                name: "Organizer",
                email: "organizer@example.com",
                username: "organizer",
                timeZone: "Asia/Kolkata",
                defaultScheduleId: null,
                schedules: [TestData.schedules.IstWorkHours],
                credentials: [getGoogleCalendarCredential()],
                selectedCalendars: [TestData.selectedCalendars.google],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "organizer@google-calendar.com",
                  primaryEmail: "organizer@google-calendar.com",
                },
              },
              {
                id: 102,
                name: "Second Host",
                email: "second-host@example.com",
                username: "second-host",
                timeZone: "Asia/Kolkata",
                defaultScheduleId: null,
                schedules: [TestData.schedules.IstWorkHours],
                credentials: [getGoogleCalendarCredential()],
                selectedCalendars: [TestData.selectedCalendars.google],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "second-host@google-calendar.com",
                  primaryEmail: "second-host@google-calendar.com",
                },
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T05:00:00.000Z`,
                endTime: `${plus1DateString}T05:30:00.000Z`,
                userId: 101,
                references: [
                  {
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "MOCK_ID_1",
                    meetingId: "MOCK_ID_1",
                    meetingPassword: "MOCK_PASS_1",
                    meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
                    credentialId: null,
                  },
                  {
                    type: appStoreMetadata.googlecalendar.type,
                    uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_1",
                    meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_1",
                    meetingPassword: "MOCK_PASSWORD",
                    meetingUrl: "https://UNUSED_URL",
                    externalCalendarId: "event-type-1@google-calendar.com",
                    credentialId: undefined,
                  },
                ],
                iCalUID,
              },
            ],
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
          videoMeetingData: {
            id: "MOCK_ID_1", // Video meeting ID is not updated during reschedule
            password: "MOCK_PASS_1",
            url: `http://mock-dailyvideo.example.com/meeting-1`,
          },
        });

        const organizerCalendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          update: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_2",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID_2",
          },
        });

        const rescheduleBookingData = getMockRequestDataForBooking({
          data: {
            start: `${plus2DateString}T11:00:00.000Z`,
            end: `${plus2DateString}T11:30:00.000Z`,
            eventTypeId: 1,
            rescheduleUid: uidOfBookingToBeRescheduled,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            rescheduledBy: organizer.email,
          },
        });

        const rescheduledBooking = await handleNewBooking({
          bookingData: rescheduleBookingData,
        });

        await expectBookingToBeInDatabase({
          description: "",
          location: BookingLocations.CalVideo,
          responses: expect.objectContaining({
            email: booker.email,
            name: booker.name,
          }),
          uid: rescheduledBooking.uid!,
          eventTypeId: rescheduleBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
          references: [
            {
              type: appStoreMetadata.dailyvideo.type,
              uid: "MOCK_ID_1",
              meetingId: "MOCK_ID_1",
              meetingPassword: "MOCK_PASS_1",
              meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
            },
            {
              type: appStoreMetadata.googlecalendar.type,
              uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_1",
              externalCalendarId: "event-type-1@google-calendar.com",
            },
          ],
        });

        expect(organizerCalendarMock.updateEventCalls.length).toBe(1);
        expect(organizerCalendarMock.createEventCalls.length).toBe(0);

        // Check availability calls for both hosts
        expect(organizerCalendarMock.getAvailabilityCalls.length).toBe(2);
      },
      timeout
    );
  });
});
