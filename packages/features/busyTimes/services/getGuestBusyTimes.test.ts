import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import dayjs from "@calcom/dayjs";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

import { GuestBusyTimesService, type IGuestBusyTimesService } from "./getGuestBusyTimes";

// Mock Prisma client
const mockPrisma = {
  booking: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  secondaryEmail: {
    findMany: vi.fn(),
  },
};

const startOfTomorrow = dayjs().add(1, "day").startOf("day");
const endOfTomorrow = dayjs().add(1, "day").endOf("day");

describe("GuestBusyTimesService", () => {
  let service: GuestBusyTimesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GuestBusyTimesService({
      prisma: mockPrisma as unknown as IGuestBusyTimesService["prisma"],
    });
  });

  describe("getGuestBusyTimes", () => {
    it("should return empty for COLLECTIVE events", async () => {
      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: SchedulingType.COLLECTIVE,
      });

      expect(result).toEqual({
        busyTimes: [],
        calComUserCount: 0,
        totalAttendeeCount: 0,
      });
      // Should not even query the database
      expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled();
    });

    it("should return empty when booking is not found", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "nonexistent-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      expect(result).toEqual({
        busyTimes: [],
        calComUserCount: 0,
        totalAttendeeCount: 0,
      });
    });

    it("should return empty when booking has no attendees", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [],
      });

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      expect(result).toEqual({
        busyTimes: [],
        calComUserCount: 0,
        totalAttendeeCount: 0,
      });
    });

    it("should return empty when no attendees are Cal.com users", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [
          { email: "external@gmail.com", name: "External User", timeZone: "UTC" },
          { email: "another@yahoo.com", name: "Another External", timeZone: "UTC" },
        ],
      });
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      expect(result).toEqual({
        busyTimes: [],
        calComUserCount: 0,
        totalAttendeeCount: 2,
      });
    });

    it("should find Cal.com user by primary email (case-insensitive)", async () => {
      const guestEmail = "guest@cal.com";
      const guestUserId = 100;

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [{ email: guestEmail.toUpperCase(), name: "Guest User", timeZone: "America/New_York" }],
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: guestUserId, email: guestEmail }]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);

      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 10,
          uid: "guest-booking-1",
          startTime: startOfTomorrow.set("hour", 14).toDate(),
          endTime: startOfTomorrow.set("hour", 15).toDate(),
          title: "Guest's existing meeting",
          status: BookingStatus.ACCEPTED,
        },
      ]);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      expect(result.calComUserCount).toBe(1);
      expect(result.totalAttendeeCount).toBe(1);
      expect(result.busyTimes).toHaveLength(1);
      expect(result.busyTimes[0]).toMatchObject({
        title: "Guest's existing meeting",
        source: "guest-booking-guest-booking-1",
      });
    });

    it("should find Cal.com user by verified secondary email", async () => {
      const secondaryEmail = "secondary@company.com";
      const primaryEmail = "primary@cal.com";
      const guestUserId = 100;

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [{ email: secondaryEmail, name: "Guest User", timeZone: "UTC" }],
      });

      // Not found by primary email
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Found by secondary email
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([
        {
          user: { id: guestUserId, email: primaryEmail },
        },
      ]);

      mockPrisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      expect(result.calComUserCount).toBe(1);
      expect(result.totalAttendeeCount).toBe(1);
      expect(result.busyTimes).toHaveLength(0);
    });

    it("should include PENDING bookings as busy times", async () => {
      const guestUserId = 100;

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [{ email: "guest@cal.com", name: "Guest", timeZone: "UTC" }],
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: guestUserId, email: "guest@cal.com" }]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);

      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 10,
          uid: "pending-booking",
          startTime: startOfTomorrow.set("hour", 10).toDate(),
          endTime: startOfTomorrow.set("hour", 11).toDate(),
          title: "Pending meeting",
          status: BookingStatus.PENDING,
        },
        {
          id: 11,
          uid: "accepted-booking",
          startTime: startOfTomorrow.set("hour", 14).toDate(),
          endTime: startOfTomorrow.set("hour", 15).toDate(),
          title: "Accepted meeting",
          status: BookingStatus.ACCEPTED,
        },
      ]);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      expect(result.busyTimes).toHaveLength(2);
      // Verify the query includes both PENDING and ACCEPTED
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                status: {
                  in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
                },
              }),
            ]),
          }),
        })
      );
    });

    it("should exclude the booking being rescheduled from busy times", async () => {
      const rescheduleUid = "booking-being-rescheduled";
      const guestUserId = 100;

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [{ email: "guest@cal.com", name: "Guest", timeZone: "UTC" }],
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: guestUserId, email: "guest@cal.com" }]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);
      mockPrisma.booking.findMany.mockResolvedValue([]);

      await service.getGuestBusyTimes({
        rescheduleUid,
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      // Verify the rescheduleUid is excluded from the query
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                uid: {
                  not: rescheduleUid,
                },
              }),
            ]),
          }),
        })
      );
    });

    it("should handle multiple attendees - some Cal.com users, some not", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [
          { email: "caluser1@cal.com", name: "Cal User 1", timeZone: "UTC" },
          { email: "external@gmail.com", name: "External User", timeZone: "UTC" },
          { email: "caluser2@cal.com", name: "Cal User 2", timeZone: "UTC" },
        ],
      });

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 100, email: "caluser1@cal.com" },
        { id: 101, email: "caluser2@cal.com" },
      ]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);

      // Set up bookings for each user
      let callCount = 0;
      mockPrisma.booking.findMany.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([
            {
              id: 10,
              uid: "user1-booking",
              startTime: startOfTomorrow.set("hour", 10).toDate(),
              endTime: startOfTomorrow.set("hour", 11).toDate(),
              title: "User 1 meeting",
              status: BookingStatus.ACCEPTED,
            },
          ]);
        }
        return Promise.resolve([
          {
            id: 11,
            uid: "user2-booking",
            startTime: startOfTomorrow.set("hour", 14).toDate(),
            endTime: startOfTomorrow.set("hour", 15).toDate(),
            title: "User 2 meeting",
            status: BookingStatus.ACCEPTED,
          },
        ]);
      });

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      expect(result.calComUserCount).toBe(2);
      expect(result.totalAttendeeCount).toBe(3);
      expect(result.busyTimes).toHaveLength(2);
    });

    it("should deduplicate users found by both primary and secondary email", async () => {
      const userId = 100;
      const primaryEmail = "user@cal.com";
      const secondaryEmail = "user.work@company.com";

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [
          { email: primaryEmail, name: "User Primary", timeZone: "UTC" },
          { email: secondaryEmail, name: "User Secondary", timeZone: "UTC" },
        ],
      });

      // Found by primary email
      mockPrisma.user.findMany.mockResolvedValue([{ id: userId, email: primaryEmail }]);

      // Also found by secondary email (same user)
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([
        {
          user: { id: userId, email: primaryEmail },
        },
      ]);

      mockPrisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      // Should only count the user once
      expect(result.calComUserCount).toBe(1);
      expect(result.totalAttendeeCount).toBe(2);

      // Should only query bookings once for this user
      expect(mockPrisma.booking.findMany).toHaveBeenCalledTimes(1);
    });

    it("should work with ROUND_ROBIN scheduling type", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [{ email: "guest@cal.com", name: "Guest", timeZone: "UTC" }],
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: 100, email: "guest@cal.com" }]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 10,
          uid: "booking-1",
          startTime: startOfTomorrow.set("hour", 10).toDate(),
          endTime: startOfTomorrow.set("hour", 11).toDate(),
          title: "Meeting",
          status: BookingStatus.ACCEPTED,
        },
      ]);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: SchedulingType.ROUND_ROBIN,
      });

      expect(result.busyTimes).toHaveLength(1);
    });

    it("should fail gracefully on database errors", async () => {
      mockPrisma.booking.findUnique.mockRejectedValue(new Error("Database connection failed"));

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      // Should return empty result, not throw
      expect(result).toEqual({
        busyTimes: [],
        calComUserCount: 0,
        totalAttendeeCount: 0,
      });
    });

    it("should find bookings where guest is the owner", async () => {
      const guestUserId = 100;

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [{ email: "guest@cal.com", name: "Guest", timeZone: "UTC" }],
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: guestUserId, email: "guest@cal.com" }]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);
      mockPrisma.booking.findMany.mockResolvedValue([]);

      await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      // Verify query checks for both userId AND attendee email
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { userId: guestUserId },
                  expect.objectContaining({
                    attendees: expect.anything(),
                  }),
                ],
              }),
            ]),
          }),
        })
      );
    });

    it("should handle null scheduling type (personal event)", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 1,
        attendees: [{ email: "guest@cal.com", name: "Guest", timeZone: "UTC" }],
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: 100, email: "guest@cal.com" }]);
      mockPrisma.secondaryEmail.findMany.mockResolvedValue([]);
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getGuestBusyTimes({
        rescheduleUid: "test-uid",
        startTime: startOfTomorrow.toDate(),
        endTime: endOfTomorrow.toDate(),
        schedulingType: null,
      });

      // Should process normally, not skip
      expect(mockPrisma.booking.findUnique).toHaveBeenCalled();
      expect(result.calComUserCount).toBe(1);
    });
  });
});
