import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockPrismaClient: {
    $queryRaw: ReturnType<typeof vi.fn>;
    booking: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    attendee: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {
      $queryRaw: vi.fn(),
      booking: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      attendee: {
        findMany: vi.fn(),
      },
    };

    repository = new BookingRepository(mockPrismaClient as unknown as PrismaClient);
  });

  describe("getTotalBookingDuration", () => {
    it("should return total minutes from the database result", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 120 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(120);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when totalMinutes is null", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: null }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(0);
    });

    it("should call query when rescheduleUid is provided", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 90 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        rescheduleUid: "existing-booking-uid",
      });

      expect(result).toBe(90);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });


  describe("findByUid", () => {
    it("should use scoped bookingSyncSelect with only consumed fields", async () => {
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      await repository.findByUid({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUnique.mock.calls[0][0];

      expect(call.where).toEqual({ uid: "test-uid" });
      expect(call).not.toHaveProperty("include");
      expect(call.select).toEqual({
        uid: true,
        status: true,
        userId: true,
        userPrimaryEmail: true,
        recurringEventId: true,
        rescheduled: true,
        startTime: true,
        endTime: true,
        eventTypeId: true,
        title: true,
        description: true,
        location: true,
        responses: true,
        smsReminderNumber: true,
      });
    });
  });

  describe("findLatestBookingInRescheduleChain", () => {
    const expectedSyncSelect = {
      uid: true,
      status: true,
      userId: true,
      userPrimaryEmail: true,
      recurringEventId: true,
      rescheduled: true,
      startTime: true,
      endTime: true,
      eventTypeId: true,
      title: true,
      description: true,
      location: true,
      responses: true,
      smsReminderNumber: true,
    };
    const mockBooking = { uid: "booking-3", status: "ACCEPTED" };

    it("should return null when CTE returns the same uid as input", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ uid: "booking-1" }]);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toBeNull();
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.booking.findUnique).not.toHaveBeenCalled();
    });

    it("should return null when CTE returns empty result", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toBeNull();
      expect(mockPrismaClient.booking.findUnique).not.toHaveBeenCalled();
    });

    it("should use bookingSyncSelect instead of include eventType when fetching latest booking", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ uid: "booking-3" }]);
      mockPrismaClient.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toEqual(mockBooking);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.booking.findUnique).toHaveBeenCalledWith({
        where: { uid: "booking-3" },
        select: expectedSyncSelect,
      });
    });

    it("should return null when latest booking is not found in DB", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ uid: "booking-3" }]);
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toBeNull();
    });
  });

  describe("updateBookingAttendees", () => {
    it("should select only required attendee fields, not include all", async () => {
      mockPrismaClient.booking.update.mockResolvedValue({
        attendees: [{ id: 1, email: "a@test.com", name: "A", timeZone: "UTC", locale: "en", phoneNumber: null }],
      });

      await repository.updateBookingAttendees({
        bookingId: 1,
        newAttendees: [{ name: "A", email: "a@test.com", timeZone: "UTC", locale: "en" }],
        updatedResponses: {},
      });

      const call = mockPrismaClient.booking.update.mock.calls[0][0];
      expect(call.select.attendees.select).toEqual({
        id: true,
        email: true,
        name: true,
        timeZone: true,
        locale: true,
        phoneNumber: true,
      });
      expect(call).not.toHaveProperty("include");
    });
  });

  describe("getAllAcceptedTeamBookingsOfUser", () => {
    const baseParams = {
      user: { id: 1, email: "user@test.com" },
      teamId: 10,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      includeManagedEvents: false,
    };

    it("should select only required fields on findMany queries", async () => {
      await repository.getAllAcceptedTeamBookingsOfUser(baseParams);

      const expectedSelect = {
        id: true,
        startTime: true,
        endTime: true,
        eventTypeId: true,
        title: true,
        userId: true,
      };

      for (const call of mockPrismaClient.booking.findMany.mock.calls) {
        expect(call[0].select).toEqual(expectedSelect);
      }
    });

    it("should use count queries when shouldReturnCount is true", async () => {
      mockPrismaClient.booking.count.mockResolvedValue(5);

      const result = await repository.getAllAcceptedTeamBookingsOfUser({
        ...baseParams,
        shouldReturnCount: true,
      });

      expect(result).toBe(10);
      expect(mockPrismaClient.booking.count).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.booking.findMany).not.toHaveBeenCalled();
    });

    it("should include managed bookings when includeManagedEvents is true", async () => {
      await repository.getAllAcceptedTeamBookingsOfUser({
        ...baseParams,
        includeManagedEvents: true,
      });

      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledTimes(3);
    });

    it("should not query managed bookings when includeManagedEvents is false", async () => {
      await repository.getAllAcceptedTeamBookingsOfUser(baseParams);

      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("getBookingAttendees", () => {
    it("should scope attendee query to only needed fields", async () => {
      mockPrismaClient.attendee.findMany.mockResolvedValue([]);

      await repository.getBookingAttendees(42);

      const call = mockPrismaClient.attendee.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ bookingId: 42 });
      expect(call.select).toBeDefined();
      expect(call.select).toEqual({
        id: true,
        email: true,
        name: true,
        timeZone: true,
        locale: true,
        phoneNumber: true,
        noShow: true,
      });
    });
  });

  describe("findByUidIncludeEventTypeAndReferences", () => {
    it("should scope attendees to explicit select instead of bare true", async () => {
      mockPrismaClient.booking.findUniqueOrThrow.mockResolvedValue({});

      await repository.findByUidIncludeEventTypeAndReferences({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUniqueOrThrow.mock.calls[0][0];
      expect(call.select.attendees).toEqual({
        select: {
          id: true,
          email: true,
          name: true,
          timeZone: true,
          locale: true,
          phoneNumber: true,
        },
      });
    });

    it("should scope references to explicit select instead of bare true", async () => {
      mockPrismaClient.booking.findUniqueOrThrow.mockResolvedValue({});

      await repository.findByUidIncludeEventTypeAndReferences({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUniqueOrThrow.mock.calls[0][0];
      expect(call.select.references).toEqual({
        select: {
          id: true,
          uid: true,
          type: true,
          meetingId: true,
          thirdPartyRecurringEventId: true,
          meetingPassword: true,
          meetingUrl: true,
          bookingId: true,
          externalCalendarId: true,
          deleted: true,
          credentialId: true,
          delegationCredentialId: true,
          domainWideDelegationCredentialId: true,
        },
      });
    });

    it("should scope destinationCalendar to explicit select instead of bare true", async () => {
      mockPrismaClient.booking.findUniqueOrThrow.mockResolvedValue({});

      await repository.findByUidIncludeEventTypeAndReferences({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUniqueOrThrow.mock.calls[0][0];
      expect(call.select.destinationCalendar).toEqual({
        select: {
          id: true,
          integration: true,
          externalId: true,
          primaryEmail: true,
          userId: true,
          credentialId: true,
        },
      });
    });

    it("should scope workflowReminders to explicit select instead of bare true", async () => {
      mockPrismaClient.booking.findUniqueOrThrow.mockResolvedValue({});

      await repository.findByUidIncludeEventTypeAndReferences({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUniqueOrThrow.mock.calls[0][0];
      expect(call.select.workflowReminders).toEqual({
        select: {
          id: true,
          referenceId: true,
          method: true,
        },
      });
    });
  });

  describe("destinationCalendar scoped select", () => {
    const expectedDestinationCalendarSelect = {
      select: {
        id: true,
        integration: true,
        externalId: true,
        primaryEmail: true,
        userId: true,
        credentialId: true,
      },
    };

    it("should scope destinationCalendar in findByUidIncludeEventTypeAttendeesAndUser (booking level)", async () => {
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      await repository.findByUidIncludeEventTypeAttendeesAndUser({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUnique.mock.calls[0][0];
      expect(call.select.destinationCalendar).toEqual(expectedDestinationCalendarSelect);
    });

    it("should scope destinationCalendar in findByUidIncludeEventTypeAttendeesAndUser (user level)", async () => {
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      await repository.findByUidIncludeEventTypeAttendeesAndUser({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUnique.mock.calls[0][0];
      expect(call.select.user.select.destinationCalendar).toEqual(expectedDestinationCalendarSelect);
    });

    it("should not include delegationCredentialId or domainWideDelegationCredentialId in destinationCalendar", async () => {
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      await repository.findByUidIncludeEventTypeAttendeesAndUser({ bookingUid: "test-uid" });

      const call = mockPrismaClient.booking.findUnique.mock.calls[0][0];
      const dcSelect = call.select.destinationCalendar.select;
      expect(dcSelect).not.toHaveProperty("delegationCredentialId");
      expect(dcSelect).not.toHaveProperty("domainWideDelegationCredentialId");
      expect(dcSelect).not.toHaveProperty("eventTypeId");
      expect(dcSelect).not.toHaveProperty("createdAt");
      expect(dcSelect).not.toHaveProperty("updatedAt");
      expect(dcSelect).not.toHaveProperty("customCalendarReminder");
    });
  });

  describe("updateRecordedStatus", () => {
    it("should include select with only id to avoid fetching full booking", async () => {
      mockPrismaClient.booking.update.mockResolvedValue({ id: 1 });

      await repository.updateRecordedStatus({
        bookingUid: "test-uid",
        isRecorded: true,
      });

      const call = mockPrismaClient.booking.update.mock.calls[0][0];
      expect(call.where).toEqual({ uid: "test-uid" });
      expect(call.data).toEqual({ isRecorded: true });
      expect(call.select).toEqual({ id: true });
    });
  });

  describe("update", () => {
    it("should include select with only id to avoid fetching full booking", async () => {
      mockPrismaClient.booking.update.mockResolvedValue({ id: 1 });

      await repository.update({
        where: { id: 1 },
        data: { status: "CANCELLED" as never },
      });

      const call = mockPrismaClient.booking.update.mock.calls[0][0];
      expect(call.select).toEqual({ id: true });
    });
  });

  describe("updateBookingStatus", () => {
    it("should include select with only id to avoid fetching full booking", async () => {
      mockPrismaClient.booking.update.mockResolvedValue({ id: 1 });

      await repository.updateBookingStatus({
        bookingId: 1,
        status: "CANCELLED" as never,
      });

      const call = mockPrismaClient.booking.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 1 });
      expect(call.select).toEqual({ id: true });
    });
  });
});
