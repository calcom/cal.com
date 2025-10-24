/**
 * These tests are integration tests that test the flow from receiving a api/book/event request and then verifying
 * - database entries created in In-MEMORY DB using prismock
 * - emails sent by checking the testEmails global variable
 * - webhooks fired by mocking fetch
 * - APIs of various apps called by mocking those apps' modules
 *
 * They don't intend to test what the apps logic should do, but rather test if the apps are called with the correct data. For testing that, once should write tests within each app.
 */
import {
  createBookingScenario,
  TestData,
  getDate,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  BookingLocations,
  createDelegationCredential,
  createOrganization,
  buildDelegationCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectWorkflowToBeTriggered,
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectBookingCreatedWebhookToHaveBeenFired,
  expectSuccessfulCalendarEventCreationInCalendar,
  expectICalUIDAsString,
  expectBookingToNotHaveReference,
  expectNoAttemptToCreateCalendarEvent,
} from "@calcom/web/test/utils/bookingScenario/expects";
import {
  getMockRequestDataForBooking,
  getMockRequestDataForDynamicGroupBooking,
} from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { vi } from "vitest";
import { describe, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { BookingStatus } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

vi.mock("@calcom/app-store/calendar.services.generated", () => {
  class MockGoogleCalendarService {
    credential: any;

    constructor(credential: any) {
      this.credential = credential;
    }

    getCredentialId() {
      return this.credential.id;
    }

    async createEvent(calEvent: any, credentialId: any, externalCalendarId?: string) {
      return {
        type: "google_calendar",
        additionalInfo: {
          hangoutLink: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
        },
        uid: "GOOGLE_CALENDAR_EVENT_ID",
        id: "GOOGLE_CALENDAR_EVENT_ID",
        iCalUID: calEvent.iCalUID || "GOOGLE_CALENDAR_EVENT_ID",
        password: "MOCK_PASSWORD",
        url: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
        createdEvent: {
          hangoutLink: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
        },
      };
    }

    async updateEvent() {
      return {};
    }

    async deleteEvent() {
      return {};
    }

    async getAvailability() {
      return [];
    }

    async getAvailabilityWithTimeZones() {
      return [];
    }

    async listCalendars() {
      return [];
    }
  }

  class MockOffice365CalendarService {
    credential: any;

    constructor(credential: any) {
      this.credential = credential;
    }

    getCredentialId() {
      return this.credential.id;
    }

    async createEvent(calEvent: any, credentialId: any, externalCalendarId?: string) {
      return {
        type: "office365_calendar",
        additionalInfo: {},
        uid: "OFFICE_365_CALENDAR_EVENT_ID",
        id: "OFFICE_365_CALENDAR_EVENT_ID",
        iCalUID: calEvent.iCalUID || "OFFICE_365_CALENDAR_EVENT_ID",
        password: "MOCK_PASSWORD",
        url: "https://UNUSED_URL",
      };
    }

    async updateEvent() {
      return {};
    }

    async deleteEvent() {
      return {};
    }

    async getAvailability() {
      return [];
    }

    async getAvailabilityWithTimeZones() {
      return [];
    }

    async listCalendars() {
      return [];
    }
  }

  return {
    CalendarServiceMap: {
      googlecalendar: Promise.resolve({ default: MockGoogleCalendarService }),
      office365calendar: Promise.resolve({ default: MockOffice365CalendarService }),
    },
  };
});

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();
  describe("Delegation Credential", () => {
    test(
      `should create a successful booking using the delegation credential when User's destination calendar is set toGoogle Calendar
      1. Should create a booking in the database with reference having Delegation credential
      2. Should create an event in calendar with Delegation credential
      3. Should use Google Meet as the location even when not explicitly set.
`,
      async ({ emails }) => {
        const handleNewBooking = getNewBookingHandler();

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

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.google],
          // User must be part of organization to be able to use that organization's Delegation credential
          teams: payloadToMakePartOfOrganization,
          // No regular credentials provided
          credentials: [],
          destinationCalendar: TestData.selectedCalendars.google,
        });

        const delegationCredential = await createDelegationCredential(org.id);
        const payloadToCreateUserEventTypeForOrganizer = {
          id: 1,
          slotInterval: 30,
          length: 30,
          users: [
            {
              id: organizer.id,
            },
          ],
        };

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
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [payloadToCreateUserEventTypeForOrganizer],
            organizer,
            apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
          })
        );

        // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID
        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "GOOGLE_CALENDAR_EVENT_ID",
            uid: "MOCK_ID",
            appSpecificData: {
              googleCalendar: {
                hangoutLink: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              },
            },
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.GoogleMeet },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.GoogleMeet,
          })
        );

        await expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
          references: [
            {
              type: appStoreMetadata.googlecalendar.type,
              uid: "GOOGLE_CALENDAR_EVENT_ID",
              meetingId: "GOOGLE_CALENDAR_EVENT_ID",
              meetingPassword: "MOCK_PASSWORD",
              meetingUrl: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              // Verify Delegation credential was used
              delegationCredentialId: delegationCredential.id,
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });

        expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
        expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
          credential: buildDelegationCredential({
            serviceAccountKey: delegationCredential.serviceAccountKey,
          }),
          calendarId: TestData.selectedCalendars.google.externalId,
          // There would be no videoCallUrl in this case as it is not a dedicated conferencing case and hangoutLink is used instead
          videoCallUrl: null,
        });

        const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

        expectSuccessfulBookingCreationEmails({
          booking: {
            uid: createdBooking.uid!,
          },
          booker,
          organizer,
          emails,
          iCalUID,
        });

        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: BookingLocations.GoogleMeet,
          subscriberUrl: "http://my-webhook.example.com",
          videoCallUrl: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
        });
      },
      timeout
    );

    test(
      `should create a successful booking using the delegation credential event when User/EventType's destination calendar is not set
      1. Should create a booking in the database with reference having Delegation credential
      2. Should create an event in calendar with Delegation credential
      3. Should use Google Meet as the location even when not explicitly set and no destination calendar is set for User/EventType
`,
      async ({ emails }) => {
        const handleNewBooking = getNewBookingHandler();

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

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.google],
          // User must be part of organization to be able to use that organization's Delegation credential
          teams: payloadToMakePartOfOrganization,
          // No regular credentials provided
          credentials: [],
        });

        const delegationCredential = await createDelegationCredential(org.id);
        const payloadToCreateUserEventTypeForOrganizer = {
          id: 1,
          slotInterval: 30,
          length: 30,
          users: [
            {
              id: organizer.id,
            },
          ],
        };

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
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [payloadToCreateUserEventTypeForOrganizer],
            organizer,
            apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
          })
        );

        // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID
        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "GOOGLE_CALENDAR_EVENT_ID",
            uid: "MOCK_ID",
            appSpecificData: {
              googleCalendar: {
                hangoutLink: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              },
            },
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.GoogleMeet },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.GoogleMeet,
          })
        );

        await expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
          references: [
            {
              type: appStoreMetadata.googlecalendar.type,
              uid: "GOOGLE_CALENDAR_EVENT_ID",
              meetingId: "GOOGLE_CALENDAR_EVENT_ID",
              meetingPassword: "MOCK_PASSWORD",
              meetingUrl: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              // Verify Delegation credential was used
              delegationCredentialId: delegationCredential.id,
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });

        expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
        expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
          credential: buildDelegationCredential({
            serviceAccountKey: delegationCredential.serviceAccountKey,
          }),
          calendarIdUsingFallbackOfFirstCalendarCredential: TestData.selectedCalendars.google.externalId,
          // There would be no videoCallUrl in this case as it is not a dedicated conferencing case and hangoutLink is used instead
          videoCallUrl: null,
        });

        const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

        expectSuccessfulBookingCreationEmails({
          booking: {
            uid: createdBooking.uid!,
          },
          booker,
          organizer,
          emails,
          iCalUID,
        });

        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: BookingLocations.GoogleMeet,
          subscriberUrl: "http://my-webhook.example.com",
          videoCallUrl: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
        });
      },
      timeout
    );

    test(
      `should create a successful booking using the office365 delegation credential with Cal Video as the location
      1. Should create a booking in the database with reference having Delegation credential
      2. Should create an event in Outlook calendar with Delegation credential
`,
      async ({ emails }) => {
        const handleNewBooking = getNewBookingHandler();

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

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.office365],
          // User must be part of organization to be able to use that organization's Delegation credential
          teams: payloadToMakePartOfOrganization,
          // No regular credentials provided
          credentials: [],
          destinationCalendar: TestData.selectedCalendars.office365,
        });

        const delegationCredential = await createDelegationCredential(org.id, "office365");
        const payloadToCreateUserEventTypeForOrganizer = {
          id: 1,
          slotInterval: 30,
          length: 30,
          users: [
            {
              id: organizer.id,
            },
          ],
        };

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
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [payloadToCreateUserEventTypeForOrganizer],
            organizer,
            apps: [TestData.apps["daily-video"], TestData.apps["office365-calendar"]],
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

        // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID
        const calendarMock = await mockCalendarToHaveNoBusySlots("office365calendar", {
          create: {
            id: "OFFICE_365_CALENDAR_EVENT_ID",
            uid: "MOCK_ID",
            appSpecificData: {
              office365Calendar: {
                url: "http://mock-dailyvideo.example.com/meeting-1",
              },
            },
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
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

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.CalVideo,
          })
        );

        console.log("createdBooking", createdBooking);

        await expectBookingToBeInDatabase({
          description: "",
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
              type: appStoreMetadata.office365calendar.type,
              uid: "OFFICE_365_CALENDAR_EVENT_ID",
              meetingId: "OFFICE_365_CALENDAR_EVENT_ID",
              meetingPassword: "MOCK_PASSWORD",
              // Verify Delegation credential was used
              delegationCredentialId: delegationCredential.id,
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });

        expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
        expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
          credential: buildDelegationCredential({
            serviceAccountKey: delegationCredential.serviceAccountKey,
          }),
          calendarId: TestData.selectedCalendars.office365.externalId,
          // There would be no videoCallUrl in this case as it is not a dedicated conferencing case and hangoutLink is used instead
          videoCallUrl: null,
        });

        const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

        expectSuccessfulBookingCreationEmails({
          booking: {
            uid: createdBooking.uid!,
          },
          booker,
          organizer,
          emails,
          iCalUID,
          calendarType: "office365_calendar",
        });

        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: BookingLocations.CalVideo,
          subscriberUrl: "http://my-webhook.example.com",
          videoCallUrl: `http://app.cal.local:3000/video/${createdBooking.uid}`,
        });
      },
      timeout
    );

    test(
      `should fail calendar event creation when organizer isn't part of the organization of DelegationCredential Credential`,
      async () => {
        const handleNewBooking = getNewBookingHandler();

        const org = await createOrganization({
          name: "Test Org",
          slug: "testorg",
          withTeam: true,
        });

        const anotherOrg = await createOrganization({
          name: "Another Org",
          slug: "anotherorg",
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

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.google],
          // User must be part of organization to be able to use that organization's Delegation credential
          teams: payloadToMakePartOfOrganization,
          // No regular credentials provided
          credentials: [],
        });

        await createDelegationCredential(anotherOrg.id);
        const payloadToCreateUserEventTypeForOrganizer = {
          id: 1,
          slotInterval: 30,
          length: 30,
          users: [
            {
              id: organizer.id,
            },
          ],
        };

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
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [payloadToCreateUserEventTypeForOrganizer],
            organizer,
            apps: [TestData.apps["daily-video"]],
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

        // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID
        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "GOOGLE_CALENDAR_EVENT_ID",
            uid: "MOCK_ID",
            appSpecificData: {
              googleCalendar: {
                hangoutLink: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              },
            },
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
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

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.CalVideo,
          })
        );

        expectNoAttemptToCreateCalendarEvent(calendarMock);

        await expectBookingToBeInDatabase({
          description: "",
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
          ],
          iCalUID: createdBooking.iCalUID,
        });

        // Could not create calendar-event
        expectBookingToNotHaveReference(createdBooking, {
          type: appStoreMetadata.googlecalendar.type,
          uid: "GOOGLE_CALENDAR_EVENT_ID",
        });
      },
      timeout
    );

    test(
      `should create a successful dynamic group booking using the delegation credential
      1. Should create a booking in the database with reference having Delegation credential
      2. Should create an event in calendar with Delegation credential for both users
      3. Should use Google Meet as the location even when not explicitly set.
`,
      async () => {
        const handleNewBooking = getNewBookingHandler();

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

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const groupUser1 = getOrganizer({
          name: "group-user-1",
          username: "group-user-1",
          email: "group-user-1@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.google],
          teams: payloadToMakePartOfOrganization,
          credentials: [],
          destinationCalendar: TestData.selectedCalendars.google,
        });

        const groupUser2 = getOrganizer({
          name: "group-user-2",
          username: "group-user-2",
          email: "group-user-2@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.google],
          teams: payloadToMakePartOfOrganization,
          credentials: [],
          destinationCalendar: TestData.selectedCalendars.google,
        });

        const delegationCredential = await createDelegationCredential(org.id);

        await createBookingScenario(
          getScenarioData({
            webhooks: [
              {
                userId: groupUser1.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl: "http://my-webhook.example.com",
                active: true,
                eventTypeId: 0,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: groupUser1.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [0],
              },
            ],
            eventTypes: [],
            users: [groupUser1, groupUser2],
            apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
          })
        );

        // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID
        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "GOOGLE_CALENDAR_EVENT_ID",
            uid: "MOCK_ID",
            appSpecificData: {
              googleCalendar: {
                hangoutLink: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              },
            },
          },
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

        const mockBookingData = getMockRequestDataForDynamicGroupBooking({
          data: {
            start: `${plus1DateString}T05:00:00.000Z`,
            end: `${plus1DateString}T05:30:00.000Z`,
            eventTypeId: 0,
            eventTypeSlug: "group-user-1+group-user-2",
            user: "group-user-1+group-user-2",
            responses: {
              email: booker.email,
              name: booker.name,
              // There is no location option during booking for Dynamic Group Bookings
              // location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.GoogleMeet,
          })
        );

        await expectBookingToBeInDatabase({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: null,
          status: BookingStatus.ACCEPTED,
          location: BookingLocations.GoogleMeet,
          references: [
            {
              type: appStoreMetadata.googlecalendar.type,
              uid: "GOOGLE_CALENDAR_EVENT_ID",
              meetingId: "GOOGLE_CALENDAR_EVENT_ID",
              meetingPassword: "MOCK_PASSWORD",
              meetingUrl: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              // Verify Delegation credential was used
              delegationCredentialId: delegationCredential.id,
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });
      },
      timeout
    );

    test(
      `should use Cal Video as the location if that is the default conferencing app set by the user. It must not use Google Meet coming from Delegation credential.`,
      async () => {
        const handleNewBooking = getNewBookingHandler();

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

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const groupUser1 = getOrganizer({
          name: "group-user-1",
          username: "group-user-1",
          email: "group-user-1@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.google],
          teams: payloadToMakePartOfOrganization,
          credentials: [],
          destinationCalendar: TestData.selectedCalendars.google,
          metadata: {
            defaultConferencingApp: {
              appSlug: "daily-video",
            },
          },
        });

        const groupUser2 = getOrganizer({
          name: "group-user-2",
          username: "group-user-2",
          email: "group-user-2@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours],
          selectedCalendars: [TestData.selectedCalendars.google],
          teams: payloadToMakePartOfOrganization,
          credentials: [],
          destinationCalendar: TestData.selectedCalendars.google,
          metadata: {
            defaultConferencingApp: {
              appSlug: "daily-video",
            },
          },
        });

        await createDelegationCredential(org.id);

        await createBookingScenario(
          getScenarioData({
            eventTypes: [],
            users: [groupUser1, groupUser2],
            apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
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

        // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "GOOGLE_CALENDAR_EVENT_ID",
            uid: "MOCK_ID",
            appSpecificData: {
              googleCalendar: {
                hangoutLink: "https://GOOGLE_MEET_URL_IN_CALENDAR_EVENT",
              },
            },
          },
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

        const mockBookingData = getMockRequestDataForDynamicGroupBooking({
          data: {
            start: `${plus1DateString}T05:00:00.000Z`,
            end: `${plus1DateString}T05:30:00.000Z`,
            eventTypeId: 0,
            eventTypeSlug: "group-user-1+group-user-2",
            user: "group-user-1+group-user-2",
            responses: {
              email: booker.email,
              name: booker.name,
              // location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        await expectBookingToBeInDatabase({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: null,
          status: BookingStatus.ACCEPTED,
          location: BookingLocations.CalVideo,
          references: [
            {
              type: appStoreMetadata.dailyvideo.type,
              // Verify Delegation credential was not used
              delegationCredentialId: null,
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });
      },
      timeout
    );
  });
});
