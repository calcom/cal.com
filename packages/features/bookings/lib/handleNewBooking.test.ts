/**
 * How to ensure that unmocked prisma queries aren't called?
 */
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, beforeEach } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getDate,
  expectWorkflowToBeTriggered,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  expectBookingToBeInDatabase,
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
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe.sequential("handleNewBooking", () => {
  beforeEach(() => {
    // Required to able to generate token in email in some cases
    process.env.CALENDSO_ENCRYPTION_KEY="abcdefghjnmkljhjklmnhjklkmnbhjui"
    mockNoTranslations();
    mockEnableEmailFeature();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  describe.sequential("Frontend:", () => {
    test(
      `should create a successful booking with Cal Video(Daily Video) if no explicit location is provided
      1. Should create a booking in the database
      2. Should send emails to the booker as well as organizer
      3. Should trigger BOOKING_CREATED webhook
    `,
      async ({ emails }) => {
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

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        const scenarioData = getScenarioData({
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
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        });

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
        });

        mockCalendarToHaveNoBusySlots("googlecalendar");
        createBookingScenario(scenarioData);

        const createdBooking = await handleNewBooking(req);
        expect(createdBooking.responses).toContain({
          email: booker.email,
          name: booker.name,
        });

        expect(createdBooking).toContain({
          location: "integrations:daily",
        });

        expectBookingToBeInDatabase({
          description: "",
          eventType: {
            connect: {
              id: mockBookingData.eventTypeId,
            },
          },
          status: BookingStatus.ACCEPTED,
        });

        expectWorkflowToBeTriggered();

        const testEmails = emails.get();
        expect(testEmails[0]).toHaveEmail({
          htmlToContain: "<title>confirmed_event_type_subject</title>",
          to: `${organizer.email}`,
        });
        expect(testEmails[1]).toHaveEmail({
          htmlToContain: "<title>confirmed_event_type_subject</title>",
          to: `${booker.name} <${booker.email}>`,
        });
        expect(testEmails[1].html).toContain("<title>confirmed_event_type_subject</title>");
        expectWebhookToHaveBeenCalledWith("http://my-webhook.example.com", {
          triggerEvent: "BOOKING_CREATED",
          payload: {
            metadata: {
              videoCallUrl: `${WEBAPP_URL}/video/DYNAMIC_UID`,
            },
            responses: {
              name: { label: "your_name", value: "Booker" },
              email: { label: "email_address", value: "booker@example.com" },
              location: {
                label: "location",
                value: { optionValue: "", value: "integrations:daily" },
              },
              title: { label: "what_is_this_meeting_about" },
              notes: { label: "additional_notes" },
              guests: { label: "additional_guests" },
              rescheduleReason: { label: "reason_for_reschedule" },
            },
          },
        });
      },
      timeout
    );

    test(
      `should submit a booking request for event requiring confirmation
      1. Should create a booking in the database with status PENDING
      2. Should send emails to the booker as well as organizer for booking request and awaiting approval
      3. Should trigger BOOKING_REQUESTED webhook
    `,
      async ({ emails }) => {
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

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        const scenarioData = getScenarioData({
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
              requiresConfirmation: true,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        });

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
        });

        mockCalendarToHaveNoBusySlots("googlecalendar");
        createBookingScenario(scenarioData);

        const createdBooking = await handleNewBooking(req);
        expect(createdBooking.responses).toContain({
          email: booker.email,
          name: booker.name,
        });

        expect(createdBooking).toContain({
          location: "integrations:daily",
        });

        expectBookingToBeInDatabase({
          description: "",
          eventType: {
            connect: {
              id: mockBookingData.eventTypeId,
            },
          },
          status: BookingStatus.PENDING,
        });

        expectWorkflowToBeTriggered();

        const testEmails = emails.get();
        expect(testEmails[0]).toHaveEmail({
          htmlToContain: "<title>event_awaiting_approval_subject</title>",
          to: `${organizer.email}`,
        });

        expect(testEmails[1]).toHaveEmail({
          htmlToContain: "<title>booking_submitted_subject</title>",
          to: `${booker.email}`,
        });

        expectWebhookToHaveBeenCalledWith("http://my-webhook.example.com", {
          triggerEvent: "BOOKING_REQUESTED",
          payload: {
            metadata: {
              // In a Pending Booking Request, we don't send the video call url
              videoCallUrl: undefined,
            },
            responses: {
              name: { label: "your_name", value: "Booker" },
              email: { label: "email_address", value: "booker@example.com" },
              location: {
                label: "location",
                value: { optionValue: "", value: "integrations:daily" },
              },
              title: { label: "what_is_this_meeting_about" },
              notes: { label: "additional_notes" },
              guests: { label: "additional_guests" },
              rescheduleReason: { label: "reason_for_reschedule" },
            },
          },
        });
      },
      timeout
    );

    test(
      `if booking with Cal Video(Daily Video) fails, booking creation fails with uncaught error`,
      async ({}) => {
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
          expect(e).toBeInstanceOf(MockError);
          expect((e as { message: string }).message).toBe("Error creating Video meeting");
        }
      },
      timeout
    );

    test(
      `should create a successful booking with Zoom if used`,
      async ({ emails }) => {
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

        const testEmails = emails.get();

        expect(testEmails[0]).toHaveEmail({
          htmlToContain: "<title>confirmed_event_type_subject</title>",
          to: `${organizer.email}`,
        });

        expect(testEmails[1]).toHaveEmail({
          htmlToContain: "<title>confirmed_event_type_subject</title>",
          to: `${booker.name} <${booker.email}>`,
        });

        expectWebhookToHaveBeenCalledWith("http://my-webhook.example.com", {
          triggerEvent: "BOOKING_CREATED",
          payload: {
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
          },
        });
      },
      timeout
    );
    test(
      `should create a successful booking when location is provided as label of an option(Done for Organizer Address)
      1. Should create a booking in the database
      2. Should send emails to the booker as well as organizer
      3. Should trigger BOOKING_CREATED webhook
    `,
      async ({ emails }) => {
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

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        const scenarioData = getScenarioData({
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
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        });

        mockCalendarToHaveNoBusySlots("googlecalendar");
        createBookingScenario(scenarioData);

        const createdBooking = await handleNewBooking(req);
        expect(createdBooking.responses).toContain({
          email: booker.email,
          name: booker.name,
        });

        expect(createdBooking).toContain({
          location: "New York",
        });

        expectBookingToBeInDatabase({
          description: "",
          eventType: {
            connect: {
              id: mockBookingData.eventTypeId,
            },
          },
          status: BookingStatus.ACCEPTED,
        });

        expectWorkflowToBeTriggered();

        const testEmails = emails.get();
        expect(testEmails[0]).toHaveEmail({
          htmlToContain: "<title>confirmed_event_type_subject</title>",
          to: `${organizer.email}`,
        });
        expect(testEmails[1]).toHaveEmail({
          htmlToContain: "<title>confirmed_event_type_subject</title>",
          to: `${booker.name} <${booker.email}>`,
        });
        expect(testEmails[1].html).toContain("<title>confirmed_event_type_subject</title>");
        expectWebhookToHaveBeenCalledWith("http://my-webhook.example.com", {
          triggerEvent: "BOOKING_CREATED",
          payload: {
            metadata: {
            },
            responses: {
              name: { label: "your_name", value: "Booker" },
              email: { label: "email_address", value: "booker@example.com" },
              location: {
                label: "location",
                value: { optionValue: "", value: "New York" },
              },
              title: { label: "what_is_this_meeting_about" },
              notes: { label: "additional_notes" },
              guests: { label: "additional_guests" },
              rescheduleReason: { label: "reason_for_reschedule" },
            },
          },
        });
      },
      timeout
    );
  });
});

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
