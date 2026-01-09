import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  BookingLocations,
  getDate,
  Timezones,
  createOrganization,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import {
  expectWorkflowToBeTriggered,
  expectSMSWorkflowToBeTriggered,
  expectSMSWorkflowToBeNotTriggered,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { describe, beforeEach, vi } from "vitest";

import { resetTestSMS } from "@calcom/lib/testSMS";
import { SMSLockState, SchedulingType } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants");

  return {
    ...actual,
    IS_SMS_CREDITS_ENABLED: false,
  };
});

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetTestSMS();
  });

  describe("User Workflows", () => {
    test(
      "should send workflow email and sms when booking is created",
      async ({ emails, sms }) => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerOtherEmail = "organizer2@example.com";
        const organizerDestinationCalendarEmailOnEventType = "organizerEventTypeEmail@example.com";

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
            primaryEmail: organizerOtherEmail,
          },
        });

        await createBookingScenario(
          getScenarioData({
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "SMS_ATTENDEE",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                useEventTypeDestinationCalendarEmail: true,
                users: [
                  {
                    id: 101,
                  },
                ],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                  primaryEmail: organizerDestinationCalendarEmailOnEventType,
                },
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

        mockCalendarToHaveNoBusySlots("googlecalendar", {
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
              smsReminderNumber: "000",
            },
          },
        });

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        expectSMSWorkflowToBeTriggered({
          sms,
          toNumber: "000",
        });

        expectWorkflowToBeTriggered({
          emailsToReceive: [organizerDestinationCalendarEmailOnEventType],
          emails,
        });
      },
      timeout
    );
    test(
      "should not send workflow sms when booking is created if the organizer is locked for sms sending",
      async ({ sms }) => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerOtherEmail = "organizer2@example.com";
        const organizerDestinationCalendarEmailOnEventType = "organizerEventTypeEmail@example.com";

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
            primaryEmail: organizerOtherEmail,
          },
          smsLockState: SMSLockState.LOCKED,
        });

        await createBookingScenario(
          getScenarioData({
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "SMS_ATTENDEE",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                useEventTypeDestinationCalendarEmail: true,
                users: [
                  {
                    id: 101,
                  },
                ],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                  primaryEmail: organizerDestinationCalendarEmailOnEventType,
                },
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockCalendarToHaveNoBusySlots("googlecalendar", {
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
              smsReminderNumber: "000",
            },
          },
        });

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        expectSMSWorkflowToBeNotTriggered({
          sms,
          toNumber: "000",
        });
      },
      timeout
    );
  });
  describe("Team Workflows", () => {
    test(
      "should send workflow email and sms when booking is created",
      async ({ emails, sms }) => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerDestinationCalendarEmailOnEventType = "organizerEventTypeEmail@example.com";

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
            primaryEmail: organizerDestinationCalendarEmailOnEventType,
          },
          teams: [
            {
              membership: {
                accepted: true,
              },
              team: {
                id: 1,
                name: "Team 1",
                slug: "team-1",
              },
            },
          ],
        });

        const otherTeamMembers = [
          {
            name: "Other Team Member 1",
            username: "other-team-member-1",
            defaultScheduleId: null,
            email: "other-team-member-1@example.com",
            timeZone: Timezones["+0:00"],
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "other-team-member-1@google-calendar.com",
            },
          },
        ];

        await createBookingScenario(
          getScenarioData({
            workflows: [
              {
                teamId: 1,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
              {
                teamId: 1,
                trigger: "NEW_EVENT",
                action: "SMS_ATTENDEE",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 15,
                schedulingType: SchedulingType.COLLECTIVE,
                length: 15,
                users: [
                  {
                    id: 101,
                  },
                  {
                    id: 102,
                  },
                ],
                teamId: 1,
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
          metadataLookupKey: "dailyvideo",
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
            start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
            end: `${getDate({ dateIncrement: 1 }).dateString}T09:15:00.000Z`,
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
              smsReminderNumber: "000",
            },
          },
        });

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        expectSMSWorkflowToBeTriggered({
          sms,
          toNumber: "000",
        });

        expectWorkflowToBeTriggered({
          emailsToReceive: [organizer.email].concat(otherTeamMembers.map((member) => member.email)),
          emails,
        });
      },
      timeout
    );

    test(
      "should not send workflow sms when booking is created if the team is locked for sms sending",
      async ({ emails, sms }) => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerDestinationCalendarEmailOnEventType = "organizerEventTypeEmail@example.com";

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
            primaryEmail: organizerDestinationCalendarEmailOnEventType,
          },
          teams: [
            {
              membership: {
                accepted: true,
              },
              team: {
                id: 1,
                name: "Team 1",
                slug: "team-1",
                smsLockState: SMSLockState.LOCKED,
              },
            },
          ],
        });

        const otherTeamMembers = [
          {
            name: "Other Team Member 1",
            username: "other-team-member-1",
            defaultScheduleId: null,
            email: "other-team-member-1@example.com",
            timeZone: Timezones["+0:00"],
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "other-team-member-1@google-calendar.com",
            },
          },
        ];

        await createBookingScenario(
          getScenarioData({
            workflows: [
              {
                teamId: 1,
                trigger: "NEW_EVENT",
                action: "SMS_ATTENDEE",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 15,
                schedulingType: SchedulingType.COLLECTIVE,
                length: 15,
                users: [
                  {
                    id: 101,
                  },
                  {
                    id: 102,
                  },
                ],
                teamId: 1,
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
          metadataLookupKey: "dailyvideo",
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
            start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
            end: `${getDate({ dateIncrement: 1 }).dateString}T09:15:00.000Z`,
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
              smsReminderNumber: "000",
            },
          },
        });

        await handleNewBooking({
          bookingData: mockBookingData,
        });

        expectSMSWorkflowToBeNotTriggered({
          sms,
          toNumber: "000",
        });
      },
      timeout
    );
  });
  describe("Org Workflows", () => {
    test("should trigger workflow when a new team event is booked and this team is active on org workflow", async ({
      emails,
    }) => {
      const handleNewBooking = getNewBookingHandler();
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        organizationId: org.id,
        teams: [
          {
            membership: {
              accepted: true,
            },
            team: {
              id: 2,
              name: "Team 1",
              slug: "team-1",
              parentId: org.id,
            },
          },
          {
            membership: {
              accepted: true,
            },
            team: {
              id: 1,
              name: "Test Org",
              slug: "testorg",
            },
          },
        ],
        schedules: [TestData.schedules.IstMorningShift],
      });

      await createBookingScenario(
        getScenarioData(
          {
            workflows: [
              {
                teamId: 1,
                trigger: "NEW_EVENT",
                action: "EMAIL_ATTENDEE",
                template: "REMINDER",
                activeOnTeams: [2],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 15,
                schedulingType: SchedulingType.COLLECTIVE,
                length: 15,
                users: [
                  {
                    id: 101,
                  },
                ],
                teamId: 2,
              },
            ],
            organizer: {
              ...organizer,
              username: "organizer",
            },
            apps: [TestData.apps["daily-video"]],
          },
          { id: org.id }
        )
      );
      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
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

      await handleNewBooking({
        bookingData: mockBookingData,
      });

      expectWorkflowToBeTriggered({
        emailsToReceive: ["booker@example.com"],
        emails,
      });
    });

    test("should trigger workflow when a new user event is booked and the user is part of an org team that is active on a org workflow", async ({
      sms,
    }) => {
      const handleNewBooking = getNewBookingHandler();
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        organizationId: org.id,
        teams: [
          {
            membership: {
              accepted: true,
            },
            team: {
              id: 2,
              name: "Team 1",
              slug: "team-1",
              parentId: org.id,
            },
          },
          {
            membership: {
              accepted: true,
            },
            team: {
              id: 1,
              name: "Test Org",
              slug: "testorg",
            },
          },
        ],
        schedules: [TestData.schedules.IstMorningShift],
      });

      await createBookingScenario(
        getScenarioData(
          {
            workflows: [
              {
                teamId: 1,
                trigger: "NEW_EVENT",
                action: "SMS_ATTENDEE",
                template: "REMINDER",
                activeOnTeams: [2],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 15,
                length: 15,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer: {
              ...organizer,
              username: "organizer",
            },
            apps: [TestData.apps["daily-video"]],
          },
          { id: org.id }
        )
      );
      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
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
            smsReminderNumber: "000",
          },
        },
      });

      await handleNewBooking({
        bookingData: mockBookingData,
      });

      expectSMSWorkflowToBeTriggered({
        sms,
        toNumber: "000",
      });
    });
  });
});
