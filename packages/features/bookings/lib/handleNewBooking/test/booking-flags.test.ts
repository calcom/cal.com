import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockCalendar,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { expectBookingToBeInDatabase } from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, test } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import { getNewBookingHandler } from "./getNewBookingHandler";

setupAndTeardown();

describe("handleNewBooking - Booking Flags", () => {
  describe("skipAvailabilityCheck flag", () => {
    test("should skip availability checks when skipAvailabilityCheck is true", async () => {
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

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

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
        })
      );

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          uid: "MOCK_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "integrations:daily" },
          },
          start: `${plus1DateString}T05:00:00.000Z`,
          end: `${plus1DateString}T05:45:00.000Z`,
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
        skipAvailabilityCheck: true,
      });

      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

      await expectBookingToBeInDatabase({
        description: "",
        location: "integrations:daily",
        responses: expect.objectContaining({
          email: booker.email,
          name: booker.name,
        }),
        uid: createdBooking.uid,
        eventTypeId: mockBookingData.eventTypeId,
        status: BookingStatus.ACCEPTED,
      });
    });
  });

  describe("skipEventLimitsCheck flag", () => {
    test("should skip event limits checks when skipEventLimitsCheck is true", async () => {
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

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
              bookingLimits: {
                PER_DAY: 1,
              },
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

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          uid: "MOCK_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "integrations:daily" },
          },
          start: `${plus1DateString}T05:00:00.000Z`,
          end: `${plus1DateString}T05:45:00.000Z`,
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
        skipEventLimitsCheck: true,
      });

      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

      await expectBookingToBeInDatabase({
        description: "",
        location: "integrations:daily",
        responses: expect.objectContaining({
          email: booker.email,
          name: booker.name,
        }),
        uid: createdBooking.uid,
        eventTypeId: mockBookingData.eventTypeId,
        status: BookingStatus.ACCEPTED,
      });
    });
  });

  describe("skipCalendarSyncTaskCreation flag", () => {
    test("should skip calendar sync when skipCalendarSyncTaskCreation is true", async () => {
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

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
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
        })
      );

      mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "integrations:daily" },
          },
          start: `${plus1DateString}T05:00:00.000Z`,
          end: `${plus1DateString}T05:45:00.000Z`,
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
        skipCalendarSyncTaskCreation: true,
      });

      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

      await expectBookingToBeInDatabase({
        description: "",
        location: "integrations:daily",
        responses: expect.objectContaining({
          email: booker.email,
          name: booker.name,
        }),
        uid: createdBooking.uid,
        eventTypeId: mockBookingData.eventTypeId,
        status: BookingStatus.ACCEPTED,
      });

      const actualBooking = await prismaMock.booking.findFirst({
        where: { uid: createdBooking.uid },
        include: { references: true },
      });
      expect(actualBooking?.references).toEqual([]);
    });
  });

  describe("combined flags", () => {
    test("should work with multiple flags enabled", async () => {
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

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
              bookingLimits: {
                PER_DAY: 1,
              },
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

      mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "integrations:daily" },
          },
          start: `${plus1DateString}T05:00:00.000Z`,
          end: `${plus1DateString}T05:45:00.000Z`,
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
        skipAvailabilityCheck: true,
        skipEventLimitsCheck: true,
        skipCalendarSyncTaskCreation: true,
      });

      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

      await expectBookingToBeInDatabase({
        description: "",
        location: "integrations:daily",
        responses: expect.objectContaining({
          email: booker.email,
          name: booker.name,
        }),
        uid: createdBooking.uid,
        eventTypeId: mockBookingData.eventTypeId,
        status: BookingStatus.ACCEPTED,
      });

      const actualBooking = await prismaMock.booking.findFirst({
        where: { uid: createdBooking.uid },
        include: { references: true },
      });
      expect(actualBooking?.references).toEqual([]);
    });
  });
});
