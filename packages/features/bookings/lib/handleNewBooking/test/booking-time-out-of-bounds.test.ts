import {
  createBookingScenario,
  getBooker,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { BookingStatus } from "@calcom/prisma/enums";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

// Local test runs sometimes get too slow
const timeout: number = process.env.CI ? 5000 : 20000;

describe("Booking Time Out of Bounds Check", () => {
  setupAndTeardown();

  describe("skipBookingTimeOutOfBoundsCheck in RegularBookingService", () => {
    test(
      "should reject a booking outside the rolling period when skipBookingTimeOutOfBoundsCheck is false (default)",
      async () => {
        const handleNewBooking = getNewBookingHandler();

        // Fix the current time so the rolling period calculation is deterministic
        vi.setSystemTime(new Date("2025-06-01T10:00:00.000Z"));

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

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                // ROLLING period of 1 calendar day means only tomorrow is bookable
                periodType: "ROLLING",
                periodDays: 1,
                periodCountCalendarDays: true,
                users: [{ id: 101 }],
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
            url: "http://mock-dailyvideo.example.com/meeting-1",
          },
        });

        await mockCalendarToHaveNoBusySlots("googlecalendar", {});

        // Book a date 90 days in the future — well outside the 1-day rolling period
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: "2025-09-01T04:00:00.000Z",
            end: "2025-09-01T04:30:00.000Z",
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(
          handleNewBooking({
            bookingData: mockBookingData,
          })
        ).rejects.toThrow(ErrorCode.BookingTimeOutOfBounds);
      },
      timeout
    );

    test(
      "should allow a booking outside the rolling period when skipBookingTimeOutOfBoundsCheck is true",
      async () => {
        const handleNewBooking = getNewBookingHandler();

        // Fix the current time so the rolling period calculation is deterministic
        vi.setSystemTime(new Date("2025-06-01T10:00:00.000Z"));

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

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                // ROLLING period of 1 calendar day means only tomorrow is bookable
                periodType: "ROLLING",
                periodDays: 1,
                periodCountCalendarDays: true,
                users: [{ id: 101 }],
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
            url: "http://mock-dailyvideo.example.com/meeting-1",
          },
        });

        await mockCalendarToHaveNoBusySlots("googlecalendar", {});

        // Same far-future date, but with the skip flag set
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: "2025-09-01T04:00:00.000Z",
            end: "2025-09-01T04:30:00.000Z",
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
          skipBookingTimeOutOfBoundsCheck: true,
        });

        expect(createdBooking).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            uid: expect.any(String),
            status: BookingStatus.ACCEPTED,
          })
        );
      },
      timeout
    );
  });
});
