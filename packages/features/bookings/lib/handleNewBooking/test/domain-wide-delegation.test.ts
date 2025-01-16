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
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  BookingLocations,
  createDwdCredential,
  createOrganization,
  buildDwdCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
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
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { BookingStatus } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();
  describe("Domain Wide Delegation", () => {
    test(
      `should create a successful booking using the domain wide delegation credential
      1. Should create a booking in the database with reference having DWD credential
      2. Should create an event in calendar with DWD credential
`,
      async ({ emails }) => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

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
          // User must be part of organization to be able to use that organization's DWD credential
          teams: payloadToMakePartOfOrganization,
          // No regular credentials provided
          credentials: [],
          destinationCalendar: [TestData.selectedCalendars.google],
        });

        const dwd = await createDwdCredential(org.id);
        const payloadToCreateUserEventTypeForOrganizer = {
          id: 1,
          slotInterval: 30,
          length: 30,
          location: BookingLocations.GoogleMeet,
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
        const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
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

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        const createdBooking = await handleNewBooking(req);

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
              // Verify DWD credential was used
              domainWideDelegationCredentialId: dwd.id,
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });

        expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
        expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
          credential: buildDwdCredential({ serviceAccountKey: dwd.serviceAccountKey }),
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
      `should fail calendar event creation when organizer isn't part of the organization of DWD Credential`,
      async () => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

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
          // User must be part of organization to be able to use that organization's DWD credential
          teams: payloadToMakePartOfOrganization,
          // No regular credentials provided
          credentials: [],
        });

        await createDwdCredential(anotherOrg.id);
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
        const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
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

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        const createdBooking = await handleNewBooking(req);

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
  });
});
