/**
 * How to ensure that unmocked prisma queries aren't called?
 */
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, beforeEach } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getScenarioData,
  getZoomAppCredential,
  mockEnableEmailFeature,
  mockNoTranslations,
  mockErrorOnVideoMeetingCreation,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  expectWebhookToHaveBeenCalledWith,
  MockError,
} from "@calcom/web/test/utils/bookingScenario";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe.sequential("handleNewBooking", () => {
  beforeEach(() => {
    mockNoTranslations();
    mockEnableEmailFeature();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  describe.sequential("Frontend:", () => {
    test(`should create a successful booking with Cal Video(Daily Video) if no explicit location is provided
    1. Should send emails to the booker as well as organizer
    `, async ({ emails }) => {
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
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const { req } = createMockNextJsRequest({
        method: "POST",
        body: getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        }),
      });

      const scenarioData = {
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
            ...organizer,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
      };

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
      });

      mockCalendarToHaveNoBusySlots("googlecalendar");

      // const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      // mockBusyCalendarTimes([
      //   {
      //     start: `${plus2DateString}T04:45:00.000Z`,
      //     end: `${plus2DateString}T23:00:00.000Z`,
      //   },
      // ]);

      createBookingScenario(scenarioData);

      const createdBooking = await handleNewBooking(req);
      expect(createdBooking.responses).toContain({
        email: booker.email,
        name: booker.name,
      });

      expect(createdBooking).toContain({
        location: "integrations:daily",
      });

      // // TODO: Verify workflows
      // expect(reminderSchedulerMock.scheduleWorkflowReminders.mock.lastCall?.[0]).toContain({
      //   smsReminderNumber: null,
      //   hideBranding: false,
      //   isFirstRecurringEvent: true,
      //   isRescheduleEvent: false,
      //   isNotConfirmed: false,
      // });

      const testEmails = emails.get();

      expect(testEmails[0]).toContain({
        to: `${organizer.email}`,
      });

      // TODO: Get the email HTML as DOM, so that we can get the title directly
      expect(testEmails[0].html).toContain("<title>confirmed_event_type_subject</title>");

      expect(testEmails[1]).toContain({
        to: `${booker.name} <${booker.email}>`,
      });
      expect(testEmails[1].html).toContain("<title>confirmed_event_type_subject</title>");
    });

    test(`if booking with Cal Video(Daily Video) fails, booking creation fails with uncaught error`, async ({}) => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const booker = getBooker({
        email: "booker@example.org",
        name: "Booker",
      });
      const organizer = TestData.users.example;
      const { req } = createMockNextJsRequest({
        method: "POST",
        body: getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        }),
      });

      const scenarioData = {
        hosts: [],
        eventTypes: [
          {
            id: 1,
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
            ...organizer,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
      };

      mockErrorOnVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
      });
      mockCalendarToHaveNoBusySlots("googlecalendar");

      createBookingScenario(scenarioData);

      try {
        await handleNewBooking(req);
      } catch (e) {
        console.log("TestRun1End");
        expect(e).toBeInstanceOf(MockError);
        expect((e as { message: string }).message).toBe("Error creating Video meeting");
      }
    }, 20000);

    test(`should create a successful booking with Zoom if used`, async ({ emails }) => {
      console.log("TestRun2");
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
        credentials: [getZoomAppCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const { req } = createMockNextJsRequest({
        method: "POST",
        body: getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:zoom" },
            },
          },
        }),
      });

      const bookingScenario = getScenarioData({
        organizer,
        eventTypes: [
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        apps: [TestData.apps["daily-video"]],
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
      });

      createBookingScenario(bookingScenario);
      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "zoomvideo",
      });
      await handleNewBooking(req);
      console.log("TestRun2End");

      const testEmails = emails.get();
      expect(testEmails[0]).toContain({
        to: `${organizer.email}`,
      });
      // TODO: Get the email HTML as DOM, so that we can get the title directly
      expect(testEmails[0].html).toContain("<title>confirmed_event_type_subject</title>");

      expect(testEmails[1]).toContain({
        to: `${booker.name} <${booker.email}>`,
      });
      expect(testEmails[1].html).toContain("<title>confirmed_event_type_subject</title>");
      expectWebhookToHaveBeenCalledWith("http://my-webhook.example.com", {
        metadata: {
          videoCallUrl: "http://mock-zoomvideo.example.com",
        },
        responses: {
          name: { label: "your_name", value: "Booker" },
          email: { label: "email_address", value: "booker@example.com" },
          location: {
            label: "location",
            value: { optionValue: "", value: "integrations:zoom" },
          },
          title: { label: "what_is_this_meeting_about" },
          notes: { label: "additional_notes" },
          guests: { label: "additional_guests" },
          rescheduleReason: { label: "reason_for_reschedule" },
        },
      });
    }, 20000);
  });
});

function getBooker({ name, email }: { name: string; email: string }) {
  return {
    name,
    email,
  };
}

function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}

function getBasicMockRequestDataForBooking() {
  return {
    start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
    end: `${getDate({ dateIncrement: 1 }).dateString}T04:30:00.000Z`,
    eventTypeSlug: "no-confirmation",
    timeZone: "Asia/Calcutta",
    language: "en",
    bookingUid: "bvCmP5rSquAazGSA7hz7ZP",
    user: "teampro",
    metadata: {},
    hasHashedBookingLink: false,
    hashedLink: null,
  };
}

function getMockRequestDataForBooking({
  data,
}: {
  data: Partial<ReturnType<typeof getBasicMockRequestDataForBooking>> & {
    eventTypeId: number;
    responses: {
      email: string;
      name: string;
      location: { optionValue: ""; value: string };
    };
  };
}) {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}
