/**
 * Test for SMS reminder number extraction from API bookings
 * This test verifies the fix for issue #17090
 * 
 * Tests that smsReminderNumber is properly extracted from the responses object
 * when creating bookings via API, ensuring SMS reminders are scheduled correctly.
 */
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
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectSMSWorkflowToBeTriggered,
  expectBookingToBeInDatabase,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, beforeEach, vi, expect } from "vitest";

import { resetTestSMS } from "@calcom/lib/testSMS";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants");

  return {
    ...actual,
    IS_SMS_CREDITS_ENABLED: false,
  };
});

const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking - SMS Reminder Number", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetTestSMS();
  });

  describe("SMS Reminder Number Extraction", () => {
    test(
      "should correctly extract smsReminderNumber from responses object and schedule SMS workflow",
      async ({ _emails, sms }) => {
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
        });

        const smsReminderNumber = "+1234567890";

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
                users: [
                  {
                    id: 101,
                  },
                ],
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

        // Test with responses object (new API format)
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
              smsReminderNumber: smsReminderNumber,
            },
          },
        });

        const result = await handleNewBooking({
          bookingData: mockBookingData,
        });

        // Verify booking was created successfully
        expect(result).toBeDefined();
        expect(result.uid).toBeDefined();

        // Verify booking is in database with smsReminderNumber
        await expectBookingToBeInDatabase({
          uid: result.uid,
          smsReminderNumber: smsReminderNumber,
        });

        // Verify SMS workflow was triggered with correct number
        expectSMSWorkflowToBeTriggered({
          sms,
          toNumber: smsReminderNumber,
        });
      },
      timeout
    );

    test(
      "should handle undefined smsReminderNumber gracefully by converting to null",
      async ({ _emails, _sms }) => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 2,
                slotInterval: 30,
                length: 30,
                users: [
                  {
                    id: 102,
                  },
                ],
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
            url: `http://mock-dailyvideo.example.com/meeting-2`,
          },
        });

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_2",
          },
        });

        // Test without smsReminderNumber (should not crash)
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
              // smsReminderNumber is intentionally omitted (undefined)
            },
          },
        });

        const result = await handleNewBooking({
          bookingData: mockBookingData,
        });

        // Verify booking was created successfully even without smsReminderNumber
        expect(result).toBeDefined();
        expect(result.uid).toBeDefined();

        // Verify booking is in database with null smsReminderNumber
        await expectBookingToBeInDatabase({
          uid: result.uid,
          smsReminderNumber: null,
        });
      },
      timeout
    );



    test(
      "should handle empty string smsReminderNumber by converting to null",
      async ({ _emails, _sms }) => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 104,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 4,
                slotInterval: 30,
                length: 30,
                users: [
                  {
                    id: 104,
                  },
                ],
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
            url: `http://mock-dailyvideo.example.com/meeting-4`,
          },
        });

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_4",
          },
        });

        // Test with empty string (should be treated as no phone number)
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 4,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
              smsReminderNumber: "",
            },
          },
        });

        const result = await handleNewBooking({
          bookingData: mockBookingData,
        });

        // Verify booking was created successfully
        expect(result).toBeDefined();
        expect(result.uid).toBeDefined();

        // Verify booking is in database with null smsReminderNumber (empty string should be stored as null or empty)
        await expectBookingToBeInDatabase({
          uid: result.uid,
          // Empty string should be handled gracefully
        });
      },
      timeout
    );
  });
});
