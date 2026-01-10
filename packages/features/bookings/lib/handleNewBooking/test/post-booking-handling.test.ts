/**
 * Post-Booking handling tests
 *
 * These tests focus specifically on testing what happens after a successful booking or rescheduling.
 */
import prismaMock from "@calcom/testing/lib/__mocks__/prisma";

import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  BookingLocations,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { expectBookingToBeInDatabase } from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, beforeEach, vi, test } from "vitest";

import { resetTestEmails } from "@calcom/lib/testEmails";
import { BookingStatus } from "@calcom/prisma/enums";

import { getNewBookingHandler } from "./getNewBookingHandler";

export type CustomNextApiRequest = NextApiRequest & Request;
export type CustomNextApiResponse = NextApiResponse & Response;

// Local test runs sometimes get too slow
const timeout = process.env.CI ? 5000 : 20000;

// Helper function to create hashed link test data
function createHashedLinkTestData({
  eventTypeId,
  usageLimit = 5,
  currentUsage = 0,
}: {
  eventTypeId: number;
  usageLimit?: number;
  currentUsage?: number;
}) {
  const link = "test-hashed-link-abc123";
  return {
    id: 1,
    link,
    eventTypeId,
    maxUsageCount: usageLimit,
    usageCount: currentUsage,
    expiresAt: null,
  };
}

// Helper function to verify hashed link usage count
async function expectHashedLinkUsageToBe(linkId: string, expectedUsageCount: number) {
  const hashedLink = await prismaMock.hashedLink.findUnique({
    where: { link: linkId },
  });
  expect(hashedLink?.usageCount).toBe(expectedUsageCount);
}

describe("Post-Booking Events - Hashed Link Usage", () => {
  setupAndTeardown();
  beforeEach(() => {
    // Reset test state before each test
    resetTestEmails();
    vi.clearAllMocks();
  });

  describe("BookingEventHandler Hashed Link Usage Tracking", () => {
    test(
      `should increment hashed link usage when booking is created with hashed link
          1. Should create a booking in the database
          2. Should increment hashed link usage count via BookingEventHandler.onBookingCreated
    `,
      async () => {
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

        const hashedLinkData = createHashedLinkTestData({
          eventTypeId: 1,
          usageLimit: 5,
          currentUsage: 2, // Should be incremented to 3 after booking
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            users: [organizer],
          })
        );

        // Create the hashed link in the database
        await prismaMock.hashedLink.create({
          data: hashedLinkData,
        });

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            uid: "HASHED_LINK_BOOKING_UID",
          },
          update: {
            iCalUID: "HASHED_LINK_BOOKING_UID",
            uid: "HASHED_LINK_BOOKING_UID",
          },
        });

        const mockBookingRequest = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            hashedLink: hashedLinkData.link,
            hasHashedBookingLink: true,
          },
        });

        const bookingResponse = await handleNewBooking({
          bookingData: mockBookingRequest,
        });

        await expectBookingToBeInDatabase({
          description: "",
          uid: bookingResponse.uid,
          location: BookingLocations.CalVideo,
          responses: expect.objectContaining({
            email: booker.email,
            name: booker.name,
          }),
          status: BookingStatus.ACCEPTED,
        });

        await expectHashedLinkUsageToBe(hashedLinkData.link, hashedLinkData.usageCount + 1);

        expect(bookingResponse.status).toEqual(BookingStatus.ACCEPTED);
        expect(bookingResponse.uid).toBeDefined();
      },
      timeout
    );

    test(
      `should increment hashed link usage when rescheduling a booking with hashed link
          1. Should reschedule the booking in the database
          2. Should increment hashed link usage count via BookingEventHandler.onBookingRescheduled
    `,
      async () => {
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

        const hashedLinkData = createHashedLinkTestData({
          eventTypeId: 1,
          usageLimit: 5,
          currentUsage: 2,
        });

        // Create an existing booking to reschedule
        const existingBookingUid = "existing-booking-uid";

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            users: [organizer],
            bookings: [
              {
                uid: existingBookingUid,
                eventTypeId: 1,
                userId: organizer.id,
                status: BookingStatus.ACCEPTED,
                startTime: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
                endTime: `${getDate({ dateIncrement: 1 }).dateString}T05:45:00.000Z`,
              },
            ],
          })
        );

        // Create the hashed link in the database
        await prismaMock.hashedLink.create({
          data: hashedLinkData,
        });

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            uid: "RESCHEDULED_BOOKING_UID",
          },
          update: {
            iCalUID: "RESCHEDULED_BOOKING_UID",
            uid: "RESCHEDULED_BOOKING_UID",
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
            hashedLink: hashedLinkData.link,
            hasHashedBookingLink: true,
            rescheduleUid: existingBookingUid,
          },
        });

        const bookingResponse = await handleNewBooking({
          bookingData: mockBookingData,
        });

        if (bookingResponse.uid) {
          await expectBookingToBeInDatabase({
            description: "",
            location: BookingLocations.CalVideo,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
            status: BookingStatus.ACCEPTED,
            uid: bookingResponse.uid,
          });
        }

        await expectHashedLinkUsageToBe(hashedLinkData.link, hashedLinkData.usageCount + 1);

        expect(bookingResponse.status).toEqual(BookingStatus.ACCEPTED);
        expect(bookingResponse.uid).toBeDefined();
      },
      timeout
    );

    test(
      `should not increment hashed link usage during dry run
          1. Should not increment hashed link usage (BookingEventHandler should skip processing)
    `,
      async () => {
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

        const hashedLinkData = createHashedLinkTestData({
          eventTypeId: 1,
          usageLimit: 5,
          currentUsage: 2,
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
                // hashedLink will be created separately in database
              },
            ],
            users: [organizer],
          })
        );

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            uid: "DRY_RUN_BOOKING_UID",
          },
        });

        // Create the hashed link in the database
        await prismaMock.hashedLink.create({
          data: hashedLinkData,
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            hashedLink: hashedLinkData.link,
            hasHashedBookingLink: true,
            _isDryRun: true,
          },
        });

        const bookingResponse = await handleNewBooking({
          bookingData: mockBookingData,
        });

        expect(bookingResponse.uid).toBe("DRY_RUN_UID");
        // Verify hashed link usage was NOT incremented during dry run
        await expectHashedLinkUsageToBe(hashedLinkData.link, hashedLinkData.usageCount);

        expect(bookingResponse.status).toEqual(BookingStatus.ACCEPTED);
      },
      timeout
    );

    test(
      `should handle hashed link service errors gracefully without failing booking creation
          1. Should create a booking successfully
          2. Should handle hashed link service errors gracefully in BookingEventHandler
          3. Should log errors but continue booking flow
    `,
      async () => {
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

        const hashedLinkData = createHashedLinkTestData({
          eventTypeId: 1,
          usageLimit: 5,
          currentUsage: 2,
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
                // hashedLink will be created separately in database
              },
            ],
            users: [organizer],
          })
        );

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            uid: "ERROR_HANDLING_BOOKING_UID",
          },
          update: {
            iCalUID: "ERROR_HANDLING_BOOKING_UID",
            uid: "ERROR_HANDLING_BOOKING_UID",
          },
        });

        // Create an invalid hashed link that will cause validation to fail
        // (maxUsageCount = 0 means it should be expired)
        const invalidHashedLinkData = {
          ...hashedLinkData,
          maxUsageCount: 0, // This will cause validation to fail
        };

        await prismaMock.hashedLink.create({
          data: invalidHashedLinkData,
        });

        const mockBookingRequest = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            hasHashedBookingLink: true,
            hashedLink: hashedLinkData.link,
          },
        });

        const bookingResponse = await handleNewBooking({
          bookingData: mockBookingRequest,
        });

        // Booking should still be created successfully despite hashed link error
        await expectBookingToBeInDatabase({
          description: "",
          uid: bookingResponse.uid,
          location: BookingLocations.CalVideo,
          responses: expect.objectContaining({
            email: booker.email,
            name: booker.name,
          }),
          status: BookingStatus.ACCEPTED,
        });

        // Verify that even though hashed link processing failed,
        await expectHashedLinkUsageToBe(hashedLinkData.link, invalidHashedLinkData.usageCount);

        expect(bookingResponse.status).toEqual(BookingStatus.ACCEPTED);
        expect(bookingResponse.uid).toBeDefined();
      },
      timeout
    );
  });
});
