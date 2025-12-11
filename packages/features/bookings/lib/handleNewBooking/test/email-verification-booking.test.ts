/**
 * These tests are unit tests that test the email verification functionality in the booking flow
 * - Test missing verification code scenario
 * - Test invalid verification code scenario
 * - Test successful verification scenario
 * - Test rate limiting behavior
 */
import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  TestData,
  getScenarioData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { vi, describe, expect, beforeEach } from "vitest";

import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

vi.mock("@calcom/features/auth/lib/verifyCodeUnAuthenticated", () => ({
  verifyCodeUnAuthenticated: vi.fn(),
}));

const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking - Email Verification", () => {
  setupAndTeardown();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Email Verification Required", () => {
    test(
      "should throw error when email verification is required but no verification code is provided",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const { verifyCodeUnAuthenticated } = await import(
          "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
        );

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const scenarioData = getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
              requiresBookerEmailVerification: true,
            },
          ],
          organizer,
        });

        await createBookingScenario(scenarioData);

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

        await expect(handleNewBooking({ bookingData: mockBookingData })).rejects.toThrow(
          expect.objectContaining({
            statusCode: 400,
            message: "email_verification_required",
          })
        );

        expect(verifyCodeUnAuthenticated).not.toHaveBeenCalled();
      },
      timeout
    );

    test(
      "should throw error when email verification is required and verification code is invalid",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const { verifyCodeUnAuthenticated } = await import(
          "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
        );

        vi.mocked(verifyCodeUnAuthenticated).mockRejectedValue(new Error("Invalid verification code"));

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const scenarioData = getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
              requiresBookerEmailVerification: true,
            },
          ],
          organizer,
        });

        await createBookingScenario(scenarioData);

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
            verificationCode: "invalid-code",
          },
        });

        await expect(handleNewBooking({ bookingData: mockBookingData })).rejects.toThrow(
          expect.objectContaining({
            statusCode: 400,
            message: "invalid_verification_code",
          })
        );

        expect(verifyCodeUnAuthenticated).toHaveBeenCalledWith(booker.email, "invalid-code");
      },
      timeout
    );

    test(
      "should successfully create booking when email verification is required and valid verification code is provided",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const { verifyCodeUnAuthenticated } = await import(
          "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
        );

        vi.mocked(verifyCodeUnAuthenticated).mockResolvedValue(undefined);

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const scenarioData = getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
              requiresBookerEmailVerification: true,
            },
          ],
          organizer,
        });

        await createBookingScenario(scenarioData);

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
            verificationCode: "valid-code",
          },
        });

        const result = await handleNewBooking({ bookingData: mockBookingData });

        expect(result).toBeDefined();
        expect(result.uid).toBeDefined();

        expect(verifyCodeUnAuthenticated).toHaveBeenCalledWith(booker.email, "valid-code");
      },
      timeout
    );

    test(
      "should handle rate limiting error from verification service",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const { verifyCodeUnAuthenticated } = await import(
          "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
        );

        const rateLimitError = new Error("Rate limit exceeded");
        rateLimitError.name = "RateLimitError";
        vi.mocked(verifyCodeUnAuthenticated).mockRejectedValue(rateLimitError);

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const scenarioData = getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
              requiresBookerEmailVerification: true,
            },
          ],
          organizer,
        });

        await createBookingScenario(scenarioData);

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
            verificationCode: "some-code",
          },
        });

        await expect(handleNewBooking({ bookingData: mockBookingData })).rejects.toThrow(
          expect.objectContaining({
            statusCode: 400,
            message: "invalid_verification_code",
          })
        );

        expect(verifyCodeUnAuthenticated).toHaveBeenCalledWith(booker.email, "some-code");
      },
      timeout
    );

    test(
      "should proceed normally when email verification is not required",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const { verifyCodeUnAuthenticated } = await import(
          "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
        );

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const scenarioData = getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
              requiresBookerEmailVerification: false,
            },
          ],
          organizer,
        });

        await createBookingScenario(scenarioData);

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

        const result = await handleNewBooking({ bookingData: mockBookingData });

        expect(result).toBeDefined();
        expect(result.uid).toBeDefined();

        expect(verifyCodeUnAuthenticated).not.toHaveBeenCalled();
      },
      timeout
    );

    test(
      "should allow rescheduling without email verification even when requiresBookerEmailVerification is true",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const { verifyCodeUnAuthenticated } = await import(
          "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
        );

        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const scenarioData = getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
              requiresBookerEmailVerification: true,
            },
          ],
          organizer,
          bookings: [
            {
              uid: "existing-booking-uid",
              eventTypeId: 1,
              userId: 101,
              status: "ACCEPTED",
              startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
              endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // tomorrow + 30 min
              attendees: [
                {
                  email: booker.email,
                  name: booker.name,
                  timeZone: "Asia/Kolkata",
                },
              ],
            },
          ],
        });

        await createBookingScenario(scenarioData);

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            rescheduleUid: "existing-booking-uid",
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        });

        const result = await handleNewBooking({ bookingData: mockBookingData });

        expect(result).toBeDefined();
        expect(result.uid).toBeDefined();

        expect(verifyCodeUnAuthenticated).not.toHaveBeenCalled();
      },
      timeout
    );
  });
});
