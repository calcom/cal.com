import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  Timezones,
  getDate,
  getExpectedCalEventForBookingRequest,
  BookingLocations,
  getZoomAppCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import {
  expectWorkflowToBeTriggered,
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectBookingCreatedWebhookToHaveBeenFired,
  expectSuccessfulCalendarEventCreationInCalendar,
  expectSuccessfulVideoMeetingCreation,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;
describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Team Events", () => {
    describe("Collective Assignment", () => {
      describe("When there is no schedule set on eventType - Hosts schedules would be used", () => {
        test(
          `succesfully creates a booking when all the hosts are free as per their schedules
          - Destination calendars for event-type and non-first hosts are used to create calendar events
        `,
          async ({ emails }) => {
            const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
            const booker = getBooker({
              email: "booker@example.com",
              name: "Booker",
            });

            const otherTeamMembers = [
              {
                name: "Other Team Member 1",
                username: "other-team-member-1",
                timeZone: Timezones["+5:30"],
                // So, that it picks the first schedule from the list
                defaultScheduleId: null,
                email: "other-team-member-1@example.com",
                id: 102,
                // Has Evening shift
                schedules: [TestData.schedules.IstEveningShift],
                credentials: [getGoogleCalendarCredential()],
                selectedCalendars: [TestData.selectedCalendars.google],
                destinationCalendar: {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "other-team-member-1@google-calendar.com",
                },
              },
            ];

            const organizer = getOrganizer({
              name: "Organizer",
              email: "organizer@example.com",
              id: 101,
              // So, that it picks the first schedule from the list
              defaultScheduleId: null,
              // Has morning shift with some overlap with morning shift
              schedules: [TestData.schedules.IstMorningShift],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "organizer@google-calendar.com",
              },
            });

            await createBookingScenario(
              getScenarioData({
                webhooks: [
                  {
                    userId: organizer.id,
                    eventTriggers: ["BOOKING_CREATED"],
                    subscriberUrl: "http://my-webhook.example.com",
                    active: true,
                    eventTypeId: 1,
                    appId: null,
                  },
                ],
                eventTypes: [
                  {
                    id: 1,
                    slotInterval: 45,
                    schedulingType: SchedulingType.COLLECTIVE,
                    length: 45,
                    users: [
                      {
                        id: 101,
                      },
                      {
                        id: 102,
                      },
                    ],
                    destinationCalendar: {
                      integration: TestData.apps["google-calendar"].type,
                      externalId: "event-type-1@google-calendar.com",
                    },
                  },
                ],
                organizer,
                usersApartFromOrganizer: otherTeamMembers,
                apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
              })
            );

            mockSuccessfulVideoMeetingCreation({
              metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
              videoMeetingData: {
                id: "MOCK_ID",
                password: "MOCK_PASS",
                url: `http://mock-dailyvideo.example.com/meeting-1`,
              },
            });

            const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
              create: {
                id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
              },
            });

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                // Try booking the first available free timeslot in both the users' schedules
                start: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
                end: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: BookingLocations.CalVideo },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            const createdBooking = await handleNewBooking(req);

            await expectBookingToBeInDatabase({
              description: "",
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
                },
                {
                  type: TestData.apps["google-calendar"].type,
                  uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                  meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                },
              ],
            });

            expectWorkflowToBeTriggered();
            expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
              destinationCalendars: [
                {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "event-type-1@google-calendar.com",
                },
                {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "other-team-member-1@google-calendar.com",
                },
              ],
              videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
            });

            expectSuccessfulBookingCreationEmails({
              booking: {
                uid: createdBooking.uid!,
              },
              booker,
              organizer,
              otherTeamMembers,
              emails,
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            });

            expectBookingCreatedWebhookToHaveBeenFired({
              booker,
              organizer,
              location: BookingLocations.CalVideo,
              subscriberUrl: "http://my-webhook.example.com",
              videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
            });
          },
          timeout
        );

        test(
          `rejects a booking when even one of the hosts is busy`,
          async ({}) => {
            const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
            const booker = getBooker({
              email: "booker@example.com",
              name: "Booker",
            });

            const otherTeamMembers = [
              {
                name: "Other Team Member 1",
                username: "other-team-member-1",
                timeZone: Timezones["+5:30"],
                // So, that it picks the first schedule from the list
                defaultScheduleId: null,
                email: "other-team-member-1@example.com",
                id: 102,
                // Has Evening shift
                schedules: [TestData.schedules.IstEveningShift],
                credentials: [getGoogleCalendarCredential()],
                selectedCalendars: [TestData.selectedCalendars.google],
                destinationCalendar: {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "other-team-member-1@google-calendar.com",
                },
              },
            ];

            const organizer = getOrganizer({
              name: "Organizer",
              email: "organizer@example.com",
              id: 101,
              // So, that it picks the first schedule from the list
              defaultScheduleId: null,
              // Has morning shift with some overlap with morning shift
              schedules: [TestData.schedules.IstMorningShift],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "organizer@google-calendar.com",
              },
            });

            await createBookingScenario(
              getScenarioData({
                webhooks: [
                  {
                    userId: organizer.id,
                    eventTriggers: ["BOOKING_CREATED"],
                    subscriberUrl: "http://my-webhook.example.com",
                    active: true,
                    eventTypeId: 1,
                    appId: null,
                  },
                ],
                eventTypes: [
                  {
                    id: 1,
                    slotInterval: 45,
                    schedulingType: SchedulingType.COLLECTIVE,
                    length: 45,
                    users: [
                      {
                        id: 101,
                      },
                      {
                        id: 102,
                      },
                    ],
                    destinationCalendar: {
                      integration: TestData.apps["google-calendar"].type,
                      externalId: "event-type-1@google-calendar.com",
                    },
                  },
                ],
                organizer,
                usersApartFromOrganizer: otherTeamMembers,
                apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
              })
            );

            mockSuccessfulVideoMeetingCreation({
              metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
              videoMeetingData: {
                id: "MOCK_ID",
                password: "MOCK_PASS",
                url: `http://mock-dailyvideo.example.com/meeting-1`,
              },
            });

            const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
              create: {
                id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
              },
            });

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                // Try booking the first available free timeslot in both the users' schedules
                start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
                end: `${getDate({ dateIncrement: 1 }).dateString}T09:15:00.000Z`,
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: BookingLocations.CalVideo },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            await expect(async () => {
              await handleNewBooking(req);
            }).rejects.toThrowError(ErrorCode.HostsUnavailableForBooking);
          },
          timeout
        );
      });

      describe("When there is a schedule set on eventType - Event Type common schedule would be used", () => {
        test(
          `succesfully creates a booking when the users are available as per the common schedule selected in the event-type
          - Destination calendars for event-type and non-first hosts are used to create calendar events
        `,
          async ({ emails }) => {
            const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
            const booker = getBooker({
              email: "booker@example.com",
              name: "Booker",
            });

            const otherTeamMembers = [
              {
                name: "Other Team Member 1",
                username: "other-team-member-1",
                timeZone: Timezones["+5:30"],
                defaultScheduleId: null,
                email: "other-team-member-1@example.com",
                id: 102,
                // No user schedules are here
                schedules: [],
                credentials: [getGoogleCalendarCredential()],
                selectedCalendars: [TestData.selectedCalendars.google],
                destinationCalendar: {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "other-team-member-1@google-calendar.com",
                },
              },
            ];

            const organizer = getOrganizer({
              name: "Organizer",
              email: "organizer@example.com",
              id: 101,
              defaultScheduleId: null,
              // No user schedules are here
              schedules: [],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "organizer@google-calendar.com",
              },
            });

            await createBookingScenario(
              getScenarioData({
                webhooks: [
                  {
                    userId: organizer.id,
                    eventTriggers: ["BOOKING_CREATED"],
                    subscriberUrl: "http://my-webhook.example.com",
                    active: true,
                    eventTypeId: 1,
                    appId: null,
                  },
                ],
                eventTypes: [
                  {
                    id: 1,
                    slotInterval: 45,
                    schedulingType: SchedulingType.COLLECTIVE,
                    length: 45,
                    users: [
                      {
                        id: 101,
                      },
                      {
                        id: 102,
                      },
                    ],
                    // Common schedule is the morning shift
                    schedule: TestData.schedules.IstMorningShift,
                    destinationCalendar: {
                      integration: TestData.apps["google-calendar"].type,
                      externalId: "event-type-1@google-calendar.com",
                    },
                  },
                ],
                organizer,
                usersApartFromOrganizer: otherTeamMembers,
                apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
              })
            );

            mockSuccessfulVideoMeetingCreation({
              metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
              videoMeetingData: {
                id: "MOCK_ID",
                password: "MOCK_PASS",
                url: `http://mock-dailyvideo.example.com/meeting-1`,
              },
            });

            const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
              create: {
                id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
              },
            });

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                // Try booking the first available free timeslot in both the users' schedules
                start: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
                end: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: BookingLocations.CalVideo },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            const createdBooking = await handleNewBooking(req);

            await expectBookingToBeInDatabase({
              description: "",
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
                },
                {
                  type: TestData.apps["google-calendar"].type,
                  uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                  meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                },
              ],
            });

            expectWorkflowToBeTriggered();
            expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
              destinationCalendars: [
                {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "event-type-1@google-calendar.com",
                },
                {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "other-team-member-1@google-calendar.com",
                },
              ],
              videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
            });

            expectSuccessfulBookingCreationEmails({
              booking: {
                uid: createdBooking.uid!,
              },
              booker,
              organizer,
              otherTeamMembers,
              emails,
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            });

            expectBookingCreatedWebhookToHaveBeenFired({
              booker,
              organizer,
              location: BookingLocations.CalVideo,
              subscriberUrl: "http://my-webhook.example.com",
              videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
            });
          },
          timeout
        );

        test(
          `rejects a booking when the timeslot isn't within the common schedule`,
          async ({}) => {
            const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
            const booker = getBooker({
              email: "booker@example.com",
              name: "Booker",
            });

            const otherTeamMembers = [
              {
                name: "Other Team Member 1",
                username: "other-team-member-1",
                timeZone: Timezones["+5:30"],
                // So, that it picks the first schedule from the list
                defaultScheduleId: null,
                email: "other-team-member-1@example.com",
                id: 102,
                schedules: [],
                credentials: [getGoogleCalendarCredential()],
                selectedCalendars: [TestData.selectedCalendars.google],
                destinationCalendar: {
                  integration: TestData.apps["google-calendar"].type,
                  externalId: "other-team-member-1@google-calendar.com",
                },
              },
            ];

            const organizer = getOrganizer({
              name: "Organizer",
              email: "organizer@example.com",
              id: 101,
              // So, that it picks the first schedule from the list
              defaultScheduleId: null,
              schedules: [],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "organizer@google-calendar.com",
              },
            });

            await createBookingScenario(
              getScenarioData({
                webhooks: [
                  {
                    userId: organizer.id,
                    eventTriggers: ["BOOKING_CREATED"],
                    subscriberUrl: "http://my-webhook.example.com",
                    active: true,
                    eventTypeId: 1,
                    appId: null,
                  },
                ],
                eventTypes: [
                  {
                    id: 1,
                    slotInterval: 45,
                    schedulingType: SchedulingType.COLLECTIVE,
                    length: 45,
                    schedule: TestData.schedules.IstMorningShift,
                    users: [
                      {
                        id: 101,
                      },
                      {
                        id: 102,
                      },
                    ],
                    destinationCalendar: {
                      integration: TestData.apps["google-calendar"].type,
                      externalId: "event-type-1@google-calendar.com",
                    },
                  },
                ],
                organizer,
                usersApartFromOrganizer: otherTeamMembers,
                apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
              })
            );

            mockSuccessfulVideoMeetingCreation({
              metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
              videoMeetingData: {
                id: "MOCK_ID",
                password: "MOCK_PASS",
                url: `http://mock-dailyvideo.example.com/meeting-1`,
              },
            });

            mockCalendarToHaveNoBusySlots("googlecalendar", {
              create: {
                id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
              },
            });

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                start: `${getDate({ dateIncrement: 1 }).dateString}T03:30:00.000Z`,
                end: `${getDate({ dateIncrement: 1 }).dateString}T03:45:00.000Z`,
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: BookingLocations.CalVideo },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            await expect(async () => {
              await handleNewBooking(req);
            }).rejects.toThrowError(ErrorCode.NoAvailableUsersFound);
          },
          timeout
        );
      });

      test(
        `When Cal Video is the location, it uses global instance credentials and createMeeting is called for it`,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const otherTeamMembers = [
            {
              name: "Other Team Member 1",
              username: "other-team-member-1",
              timeZone: Timezones["+5:30"],
              defaultScheduleId: 1001,
              email: "other-team-member-1@example.com",
              id: 102,
              schedules: [{ ...TestData.schedules.IstWorkHours, id: 1001 }],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "other-team-member-1@google-calendar.com",
              },
            },
          ];

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            // Even though Daily Video credential isn't here, it would still work because it's a globally installed app and credentials are available on instance level
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "organizer@google-calendar.com",
            },
          });

          const { eventTypes } = await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 45,
                  schedulingType: SchedulingType.COLLECTIVE,
                  length: 45,
                  users: [
                    {
                      id: 101,
                    },
                    {
                      id: 102,
                    },
                  ],
                  destinationCalendar: {
                    integration: TestData.apps["google-calendar"].type,
                    externalId: "event-type-1@google-calendar.com",
                  },
                },
              ],
              organizer,
              usersApartFromOrganizer: otherTeamMembers,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            })
          );

          const videoMock = mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
            videoMeetingData: {
              id: "MOCK_ID",
              password: "MOCK_PASS",
              url: `http://mock-dailyvideo.example.com/meeting-1`,
            },
          });

          const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
            create: {
              id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            },
          });

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
              end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          const createdBooking = await handleNewBooking(req);

          await expectBookingToBeInDatabase({
            description: "",
            location: BookingLocations.CalVideo,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
            references: [
              {
                type: appStoreMetadata.dailyvideo.type,
                uid: "MOCK_ID",
                meetingId: "MOCK_ID",
                meetingPassword: "MOCK_PASS",
                meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
              },
              {
                type: appStoreMetadata.googlecalendar.type,
                uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingPassword: "MOCK_PASSWORD",
                meetingUrl: "https://UNUSED_URL",
              },
            ],
          });

          expectWorkflowToBeTriggered();
          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
            destinationCalendars: [
              {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
              {
                integration: TestData.apps["google-calendar"].type,
                externalId: "other-team-member-1@google-calendar.com",
              },
            ],
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
          });

          expectSuccessfulVideoMeetingCreation(videoMock, {
            credential: expect.objectContaining({
              appId: "daily-video",
              key: {
                apikey: "MOCK_DAILY_API_KEY",
              },
            }),
            calEvent: expect.objectContaining(
              getExpectedCalEventForBookingRequest({
                bookingRequest: mockBookingData,
                eventType: eventTypes[0],
              })
            ),
          });

          expectSuccessfulBookingCreationEmails({
            booking: {
              uid: createdBooking.uid!,
            },
            booker,
            organizer,
            otherTeamMembers,
            emails,
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        `When Zoom is the location, it uses credentials of the first host and createMeeting is called for it.`,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const otherTeamMembers = [
            {
              name: "Other Team Member 1",
              username: "other-team-member-1",
              timeZone: Timezones["+5:30"],
              defaultScheduleId: 1001,
              email: "other-team-member-1@example.com",
              id: 102,
              schedules: [
                {
                  ...TestData.schedules.IstWorkHours,
                  // Specify an ID directly here because we want to be able to use that ID in defaultScheduleId above.
                  id: 1001,
                },
              ],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "other-team-member-1@google-calendar.com",
              },
            },
          ];

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [
              {
                id: 2,
                ...getGoogleCalendarCredential(),
              },
              {
                id: 1,
                ...getZoomAppCredential(),
              },
            ],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "organizer@google-calendar.com",
            },
          });

          const { eventTypes } = await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 45,
                  schedulingType: SchedulingType.COLLECTIVE,
                  length: 45,
                  users: [
                    {
                      id: 101,
                    },
                    {
                      id: 102,
                    },
                  ],
                  locations: [
                    {
                      type: BookingLocations.ZoomVideo,
                      credentialId: 1,
                    },
                  ],
                  destinationCalendar: {
                    integration: TestData.apps["google-calendar"].type,
                    externalId: "event-type-1@google-calendar.com",
                  },
                },
              ],
              organizer,
              usersApartFromOrganizer: otherTeamMembers,
              apps: [TestData.apps["google-calendar"], TestData.apps["zoomvideo"]],
            })
          );

          const videoMock = mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "zoomvideo",
            videoMeetingData: {
              id: "MOCK_ID",
              password: "MOCK_PASS",
              url: `http://mock-zoomvideo.example.com/meeting-1`,
            },
          });

          const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
            create: {
              id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            },
          });

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
              end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.ZoomVideo },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          const createdBooking = await handleNewBooking(req);

          await expectBookingToBeInDatabase({
            description: "",
            location: BookingLocations.ZoomVideo,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
            references: [
              {
                type: TestData.apps.zoomvideo.type,
                meetingId: "MOCK_ID",
                meetingPassword: "MOCK_PASS",
                meetingUrl: "http://mock-zoomvideo.example.com/meeting-1",
              },
              {
                type: TestData.apps["google-calendar"].type,
                uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingPassword: "MOCK_PASSWORD",
                meetingUrl: "https://UNUSED_URL",
              },
            ],
          });

          expectWorkflowToBeTriggered();
          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
            destinationCalendars: [
              {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
              {
                integration: TestData.apps["google-calendar"].type,
                externalId: "other-team-member-1@google-calendar.com",
              },
            ],
            videoCallUrl: "http://mock-zoomvideo.example.com/meeting-1",
          });

          expectSuccessfulVideoMeetingCreation(videoMock, {
            credential: expect.objectContaining({
              appId: TestData.apps.zoomvideo.slug,
              key: expect.objectContaining({
                access_token: "ACCESS_TOKEN",
                refresh_token: "REFRESH_TOKEN",
                token_type: "Bearer",
              }),
            }),
            calEvent: expect.objectContaining(
              getExpectedCalEventForBookingRequest({
                bookingRequest: mockBookingData,
                eventType: eventTypes[0],
              })
            ),
          });

          expectSuccessfulBookingCreationEmails({
            booking: {
              uid: createdBooking.uid!,
            },
            booker,
            organizer,
            otherTeamMembers,
            emails,
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.ZoomVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `http://mock-zoomvideo.example.com/meeting-1`,
          });
        },
        timeout
      );
    });

    test.todo("Round Robin booking");
  });

  describe("Team Plus Paid Events", () => {
    test.todo("Collective event booking");
    test.todo("Round Robin booking");
  });
  test.todo("Calendar and video Apps installed on a Team  Account");
});
