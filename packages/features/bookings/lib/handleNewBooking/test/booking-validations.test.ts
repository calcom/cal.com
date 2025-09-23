/**
 * Booking Validation Specifications
 * These specifications verify the business rules and validation behavior for booking creation
 */
import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";
import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  getGoogleCalendarCredential,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { afterEach, vi } from "vitest";
import { describe, expect } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

function addToBlacklistedEmails(emails: string[]) {
  process.env.BLACKLISTED_GUEST_EMAILS = emails.join(",");
}

function resetBlacklistedEmails() {
  delete process.env.BLACKLISTED_GUEST_EMAILS;
}

afterEach(() => { 
  resetBlacklistedEmails();
});

describe("Booking Validation Specifications", () => {
  setupAndTeardown();

  describe("Email Blacklist Validation", () => {
    test("when email is in BLACKLISTED_GUEST_EMAILS, allow the user to book only if they are logged in with that email", async () => {
      const handleNewBooking = getNewBookingHandler();
      const blockedEmail = "organizer@example.com"; // Use organizer's email as the blocked one

      const booker = getBooker({
        email: blockedEmail,
        name: "Organizer",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        emailVerified: new Date(),
      });

      addToBlacklistedEmails(["organizer@example.com", "spam@test.com"]);

      await createBookingScenario(
        getScenarioData({
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
          apps: [TestData.apps["google-calendar"]],
        })
      );

      await mockCalendarToHaveNoBusySlots("googlecalendar", {});

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

      // Non logged in user should not be able to book
      await expect(handleNewBooking({
        bookingData: mockBookingData,
      })).rejects.toThrow(
        "Attendee email has been blocked. Make sure to login as organizer@example.com to use this email for creating a booking."
      );

      // Should allow booking when the user who owns the blacklisted email is logged in
      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
        userId: 101, // Same as organizer who owns the blacklisted email
      });

      expect(createdBooking).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          uid: expect.any(String),
          status: BookingStatus.ACCEPTED,
        })
      );
    });

    test("prevents booking when blacklisted email is not verified in the system", async () => {
      const handleNewBooking = getNewBookingHandler();
      const blockedEmail = "blocked@example.com";

      const booker = getBooker({
        email: blockedEmail,
        name: "Unverified User",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        emailVerified: null,
      });

      // Mock environment variable for blacklisted emails
      addToBlacklistedEmails(["blocked@example.com"]);

      await createBookingScenario(
        getScenarioData({
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
          apps: [TestData.apps["google-calendar"]],
        })
      );

      await mockCalendarToHaveNoBusySlots("googlecalendar", {});

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

      // Should prevent booking when blacklisted email has no verified user in database
      await expect(handleNewBooking({
        bookingData: mockBookingData,
      })).rejects.toThrow("Cannot use this email to create the booking.");
    });
  });

  describe("Active Bookings Limit Validation", () => {
    test("allows booking when user is under their active booking limit", async () => {
      vi.setSystemTime(new Date("2025-01-01"));
      const plus1DateString = "2025-01-02";

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

      // Create test scenario with event type that has maxActiveBookingsPerBooker limit
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              // Two bookings allowed for the booker
              maxActiveBookingsPerBooker: 2,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"]],
          bookings: [
            {
              uid: "existing-booking-1",
              eventTypeId: 1,
              userId: organizer.id,
              startTime: `${plus1DateString}T10:00:00.000Z`,
              endTime: `${plus1DateString}T10:30:00.000Z`,
              title: "Existing Booking",
              status: BookingStatus.ACCEPTED,
              // Booker already has a booking in future
              attendees: [{
                email: booker.email,
              }],
            },
          ],
        })
      );

      await mockCalendarToHaveNoBusySlots("googlecalendar", {});


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

      // Should allow booking when user has not reached their limit (1 booking < 2 limit)
      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          uid: expect.any(String),
          status: BookingStatus.ACCEPTED,
        })
      );

      // Second booking should be rejected
      await expect(handleNewBooking({
        bookingData: mockBookingData,
      })).rejects.toThrow("booker_limit_exceeded_error");
    });

    test("enforces booking limits with reschedule option when enabled", async () => {
      vi.setSystemTime(new Date("2025-01-01"));
      const plus1DateString = "2025-01-02";
      const plus2DateString = "2025-01-03";

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

      // Create test scenario with event type that has reschedule option enabled
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              maxActiveBookingsPerBooker: 2,
              maxActiveBookingPerBookerOfferReschedule: true,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"]],
          bookings: [
            {
              uid: "existing-booking-1",
              eventTypeId: 1,
              userId: organizer.id,
              startTime: `${plus1DateString}T10:00:00.000Z`,
              endTime: `${plus1DateString}T10:30:00.000Z`,
              title: "Existing Booking",
              status: BookingStatus.ACCEPTED,
              attendees: [{
                email: booker.email,
              }],
            },
            {
              uid: "existing-booking-2",
              eventTypeId: 1,
              userId: organizer.id,
              startTime: `${plus2DateString}T10:00:00.000Z`,
              endTime: `${plus2DateString}T10:30:00.000Z`,
              title: "Existing Booking",
              status: BookingStatus.ACCEPTED,
              attendees: [{
                email: booker.email,
              }],
            },
          ],
        })
      );

      await mockCalendarToHaveNoBusySlots("googlecalendar", {});

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

      try {
        await handleNewBooking({
          bookingData: mockBookingData,
        });
      } catch (error) {
        expect(error.message).toEqual("booker_limit_exceeded_error_reschedule");
        expect(error.data).toEqual(
          expect.objectContaining({
            rescheduleUid: "existing-booking-1",
          })
        );
      }
    });
  });
});
