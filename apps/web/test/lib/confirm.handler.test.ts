import {
  createBookingScenario,
  getOrganizer,
  getScenarioData,
  TestData,
  mockSuccessfulVideoMeetingCreation,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";

import { describe, it, beforeEach, vi, expect } from "vitest";

import * as handleConfirmationModule from "@calcom/features/bookings/lib/handleConfirmation";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import { BookingStatus } from "@calcom/prisma/enums";
import { confirmHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";

vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => {
  const onBookingAccepted = vi.fn().mockResolvedValue(undefined);
  const onBulkBookingsAccepted = vi.fn().mockResolvedValue(undefined);
  const onBookingRejected = vi.fn().mockResolvedValue(undefined);
  const onBulkBookingsRejected = vi.fn().mockResolvedValue(undefined);

  // Create a single service instance that will be returned
  const mockService = {
    onBookingAccepted,
    onBulkBookingsAccepted,
    onBookingRejected,
    onBulkBookingsRejected,
  };

  return {
    getBookingEventHandlerService: vi.fn(() => mockService),
  };
});

describe("confirmHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Booking Accepted", () => {
    it("should pass hideCalendarNotes property to CalendarEvent when enabled", async () => {
      vi.setSystemTime("2050-01-07T00:00:00Z");

      const handleConfirmationSpy = vi.spyOn(handleConfirmationModule, "handleConfirmation");

      const attendeeUser = getOrganizer({
        email: "test@example.com",
        name: "test name",
        id: 102,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const uidOfBooking = "hideNotes123";
      const iCalUID = `${uidOfBooking}@Cal.com`;

      const plus1DateString = "2050-01-08";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              locations: [],
              hideCalendarNotes: true,
              hideCalendarEventDetails: true,
              requiresConfirmation: true,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 101,
              uid: uidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.PENDING,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              references: [],
              iCalUID,
              location: "integrations:daily",
              attendees: [attendeeUser],
              responses: {
                name: attendeeUser.name,
                email: attendeeUser.email,
                notes: "Sensitive information",
              },
              user: { id: organizer.id },
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
      });

      const ctx = {
        user: {
          id: organizer.id,
          name: organizer.name,
          timeZone: organizer.timeZone,
          username: organizer.username,
        } as NonNullable<TrpcSessionUser>,
        traceContext: distributedTracing.createTrace("test_confirm_handler"),
      };

      const res = await confirmHandler({
        ctx,
        input: {
          bookingId: 101,
          confirmed: true,
          reason: "",
          emailsEnabled: true,
          actor: makeUserActor(ctx.user.uuid),
          actionSource: "WEBAPP",
        },
      });

      expect(res?.status).toBe(BookingStatus.ACCEPTED);
      expect(handleConfirmationSpy).toHaveBeenCalledTimes(1);

      const handleConfirmationCall = handleConfirmationSpy.mock.calls[0][0];
      const calendarEvent = handleConfirmationCall.evt;

      expect(calendarEvent.hideCalendarNotes).toBe(true);
      expect(calendarEvent.hideCalendarEventDetails).toBe(true);
    });

    it("should call BookingEventHandlerService.onBookingAccepted with correct arguments when confirming a booking", async () => {
      vi.setSystemTime("2050-01-07T00:00:00Z");

      const attendeeUser = getOrganizer({
        email: "test@example.com",
        name: "test name",
        id: 102,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const uidOfBooking = "testBooking123";
      const iCalUID = `${uidOfBooking}@Cal.com`;

      const plus1DateString = "2050-01-08";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              locations: [],
              requiresConfirmation: true,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 101,
              uid: uidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.PENDING,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              references: [],
              iCalUID,
              location: "integrations:daily",
              attendees: [attendeeUser],
              responses: { name: attendeeUser.name, email: attendeeUser.email },
              user: { id: organizer.id },
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
      });

      const testUserUuid = "test-uuid-101";
      const ctx = {
        user: {
          id: organizer.id,
          name: organizer.name,
          timeZone: organizer.timeZone,
          username: organizer.username,
          uuid: testUserUuid,
        } as NonNullable<TrpcSessionUser>,
        traceContext: distributedTracing.createTrace("test_confirm_handler"),
      };

      const actor = makeUserActor(ctx.user.uuid);

      const res = await confirmHandler({
        ctx,
        input: {
          bookingId: 101,
          confirmed: true,
          reason: "",
          emailsEnabled: true,
          actor,
          actionSource: "WEBAPP",
        },
      });

      expect(res?.status).toBe(BookingStatus.ACCEPTED);

      // Get the mock service instance to access the mocks
      const mockService = getBookingEventHandlerService();
      expect(mockService.onBookingAccepted).toHaveBeenCalledTimes(1);

      const callArgs = vi.mocked(mockService.onBookingAccepted).mock.calls[0][0];
      expect(callArgs.bookingUid).toBe(uidOfBooking);
      expect(callArgs.actor).toEqual(actor);
      expect(callArgs.auditData).toEqual({
        status: { old: BookingStatus.PENDING, new: BookingStatus.ACCEPTED },
      });
      expect(callArgs.source).toBe("WEBAPP");
      expect(callArgs.organizationId).toBeNull();
    });

    it("should call BookingEventHandlerService.onBulkBookingsAccepted when confirming recurring bookings", async () => {
      vi.setSystemTime("2050-01-07T00:00:00Z");

      const attendeeUser = getOrganizer({
        email: "test@example.com",
        name: "test name",
        id: 102,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const recurringEventId = "recurring123";
      const uidOfBooking1 = "testBooking1";
      const uidOfBooking2 = "testBooking2";
      const iCalUID1 = `${uidOfBooking1}@Cal.com`;
      const iCalUID2 = `${uidOfBooking2}@Cal.com`;

      const plus1DateString = "2050-01-08";
      const plus2DateString = "2050-01-09";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              locations: [],
              requiresConfirmation: true,
              recurringEvent: { freq: 2, count: 3, interval: 1 },
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 101,
              uid: uidOfBooking1,
              eventTypeId: 1,
              status: BookingStatus.PENDING,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              references: [],
              iCalUID: iCalUID1,
              location: "integrations:daily",
              attendees: [attendeeUser],
              responses: { name: attendeeUser.name, email: attendeeUser.email },
              user: { id: organizer.id },
              recurringEventId,
            },
            {
              id: 102,
              uid: uidOfBooking2,
              eventTypeId: 1,
              status: BookingStatus.PENDING,
              startTime: `${plus2DateString}T05:00:00.000Z`,
              endTime: `${plus2DateString}T05:15:00.000Z`,
              references: [],
              iCalUID: iCalUID2,
              location: "integrations:daily",
              attendees: [attendeeUser],
              responses: { name: attendeeUser.name, email: attendeeUser.email },
              user: { id: organizer.id },
              recurringEventId,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
      });

      const testUserUuid = "test-uuid-101";
      const ctx = {
        user: {
          id: organizer.id,
          name: organizer.name,
          timeZone: organizer.timeZone,
          username: organizer.username,
          uuid: testUserUuid,
        } as NonNullable<TrpcSessionUser>,
        traceContext: distributedTracing.createTrace("test_confirm_handler"),
      };

      const actor = makeUserActor(ctx.user.uuid);

      const res = await confirmHandler({
        ctx,
        input: {
          bookingId: 101,
          recurringEventId,
          confirmed: true,
          reason: "",
          emailsEnabled: true,
          actor,
          actionSource: "WEBAPP",
        },
      });

      expect(res?.status).toBe(BookingStatus.ACCEPTED);

      // Get the mock service instance to access the mocks
      const mockService = getBookingEventHandlerService();
      expect(mockService.onBulkBookingsAccepted).toHaveBeenCalledTimes(1);

      const callArgs = vi.mocked(mockService.onBulkBookingsAccepted).mock.calls[0][0];
      expect(callArgs.bookings).toHaveLength(2);
      expect(callArgs.bookings[0].bookingUid).toBe(uidOfBooking1);
      expect(callArgs.bookings[0].auditData).toEqual({
        status: { old: BookingStatus.PENDING, new: BookingStatus.ACCEPTED },
      });
      expect(callArgs.bookings[1].bookingUid).toBe(uidOfBooking2);
      expect(callArgs.bookings[1].auditData).toEqual({
        status: { old: BookingStatus.PENDING, new: BookingStatus.ACCEPTED },
      });
      expect(callArgs.actor).toEqual(actor);
      expect(callArgs.source).toBe("WEBAPP");
      expect(callArgs.organizationId).toBeNull();
      expect(callArgs.operationId).toBeDefined();
    });
  });

  describe("Booking Rejected", () => {
    it("should call BookingEventHandlerService.onBookingRejected with correct arguments when rejecting a booking", async () => {
      vi.setSystemTime("2050-01-07T00:00:00Z");

      const attendeeUser = getOrganizer({
        email: "test@example.com",
        name: "test name",
        id: 102,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const uidOfBooking = "testBooking456";
      const iCalUID = `${uidOfBooking}@Cal.com`;

      const plus1DateString = "2050-01-08";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              locations: [],
              requiresConfirmation: true,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 103,
              uid: uidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.PENDING,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              references: [],
              iCalUID,
              location: "integrations:daily",
              attendees: [attendeeUser],
              responses: { name: attendeeUser.name, email: attendeeUser.email },
              user: { id: organizer.id },
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      const testUserUuid = "test-uuid-101";
      const ctx = {
        user: {
          id: organizer.id,
          name: organizer.name,
          timeZone: organizer.timeZone,
          username: organizer.username,
          uuid: testUserUuid,
        } as NonNullable<TrpcSessionUser>,
        traceContext: distributedTracing.createTrace("test_confirm_handler"),
      };

      const actor = makeUserActor(ctx.user.uuid);
      const rejectionReason = "Not available";

      const res = await confirmHandler({
        ctx,
        input: {
          bookingId: 103,
          confirmed: false,
          reason: rejectionReason,
          emailsEnabled: false,
          actor,
          actionSource: "WEBAPP",
        },
      });

      expect(res?.status).toBe(BookingStatus.REJECTED);

      // Get the mock service instance to access the mocks
      const mockService = getBookingEventHandlerService();
      expect(mockService.onBookingRejected).toHaveBeenCalledTimes(1);

      const callArgs = vi.mocked(mockService.onBookingRejected).mock.calls[0][0];
      expect(callArgs.bookingUid).toBe(uidOfBooking);
      expect(callArgs.actor).toEqual(actor);
      expect(callArgs.auditData).toEqual({
        rejectionReason,
        status: { old: BookingStatus.PENDING, new: BookingStatus.REJECTED },
      });
      expect(callArgs.source).toBe("WEBAPP");
      expect(callArgs.organizationId).toBeNull();
    });

    it("should call BookingEventHandlerService.onBulkBookingsRejected when rejecting recurring bookings", async () => {
      vi.setSystemTime("2050-01-07T00:00:00Z");

      const attendeeUser = getOrganizer({
        email: "test@example.com",
        name: "test name",
        id: 102,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const recurringEventId = "recurring456";
      const uidOfBooking1 = "testBooking3";
      const uidOfBooking2 = "testBooking4";
      const iCalUID1 = `${uidOfBooking1}@Cal.com`;
      const iCalUID2 = `${uidOfBooking2}@Cal.com`;

      const plus1DateString = "2050-01-08";
      const plus2DateString = "2050-01-09";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              locations: [],
              requiresConfirmation: true,
              recurringEvent: { freq: 2, count: 3, interval: 1 },
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 104,
              uid: uidOfBooking1,
              eventTypeId: 1,
              status: BookingStatus.PENDING,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              references: [],
              iCalUID: iCalUID1,
              location: "integrations:daily",
              attendees: [attendeeUser],
              responses: { name: attendeeUser.name, email: attendeeUser.email },
              user: { id: organizer.id },
              recurringEventId,
            },
            {
              id: 105,
              uid: uidOfBooking2,
              eventTypeId: 1,
              status: BookingStatus.PENDING,
              startTime: `${plus2DateString}T05:00:00.000Z`,
              endTime: `${plus2DateString}T05:15:00.000Z`,
              references: [],
              iCalUID: iCalUID2,
              location: "integrations:daily",
              attendees: [attendeeUser],
              responses: { name: attendeeUser.name, email: attendeeUser.email },
              user: { id: organizer.id },
              recurringEventId,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      const testUserUuid = "test-uuid-101";
      const ctx = {
        user: {
          id: organizer.id,
          name: organizer.name,
          timeZone: organizer.timeZone,
          username: organizer.username,
          uuid: testUserUuid,
        } as NonNullable<TrpcSessionUser>,
        traceContext: distributedTracing.createTrace("test_confirm_handler"),
      };

      const actor = makeUserActor(ctx.user.uuid);
      const rejectionReason = "Organizer not available";

      const res = await confirmHandler({
        ctx,
        input: {
          bookingId: 104,
          recurringEventId,
          confirmed: false,
          reason: rejectionReason,
          emailsEnabled: false,
          actor,
          actionSource: "WEBAPP",
        },
      });

      expect(res?.status).toBe(BookingStatus.REJECTED);

      // Get the mock service instance to access the mocks
      const mockService = getBookingEventHandlerService();
      expect(mockService.onBulkBookingsRejected).toHaveBeenCalledTimes(1);

      const callArgs = vi.mocked(mockService.onBulkBookingsRejected).mock.calls[0][0];
      expect(callArgs.bookings).toHaveLength(2);
      expect(callArgs.bookings[0].bookingUid).toBe(uidOfBooking1);
      expect(callArgs.bookings[0].auditData).toEqual({
        rejectionReason,
        status: { old: BookingStatus.PENDING, new: BookingStatus.REJECTED },
      });
      expect(callArgs.bookings[1].bookingUid).toBe(uidOfBooking2);
      expect(callArgs.bookings[1].auditData).toEqual({
        rejectionReason,
        status: { old: BookingStatus.PENDING, new: BookingStatus.REJECTED },
      });
      expect(callArgs.actor).toEqual(actor);
      expect(callArgs.source).toBe("WEBAPP");
      expect(callArgs.organizationId).toBeNull();
      expect(callArgs.operationId).toBeDefined();
    });
  });
});
