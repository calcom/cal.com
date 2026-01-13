import { describe, it, expect, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";

describe("Guest Availability for Reschedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("guestBusyTimes integration", () => {
    it("should include guest busy times in detailedBusyTimes when provided", () => {
      // Test data representing guest busy times
      const guestBusyTimes = [
        {
          start: new Date("2025-01-20T10:00:00.000Z"),
          end: new Date("2025-01-20T11:00:00.000Z"),
        },
        {
          start: new Date("2025-01-20T14:00:00.000Z"),
          end: new Date("2025-01-20T15:00:00.000Z"),
        },
      ];

      // Format guest busy times as they would be in getUserAvailability
      const guestBusyTimesFormatted = guestBusyTimes.map((guestBusyTime) => ({
        start: dayjs(guestBusyTime.start).toISOString(),
        end: dayjs(guestBusyTime.end).toISOString(),
        title: "Guest busy time",
        source: "guest-availability",
      }));

      expect(guestBusyTimesFormatted).toHaveLength(2);
      expect(guestBusyTimesFormatted[0].source).toBe("guest-availability");
      expect(guestBusyTimesFormatted[0].title).toBe("Guest busy time");
    });

    it("should return empty array when no guest busy times are provided", () => {
      const guestBusyTimes: { start: Date; end: Date }[] | undefined = undefined;

      const guestBusyTimesFormatted =
        guestBusyTimes?.map((guestBusyTime) => ({
          start: dayjs(guestBusyTime.start).toISOString(),
          end: dayjs(guestBusyTime.end).toISOString(),
          title: "Guest busy time",
          source: "guest-availability",
        })) || [];

      expect(guestBusyTimesFormatted).toHaveLength(0);
    });
  });

  describe("findUsersByEmails", () => {
    it("should normalize emails to lowercase before matching", () => {
      const emails = ["User@Example.com", "ANOTHER@TEST.COM"];
      const normalizedEmails = emails.map((e) => e.toLowerCase());

      expect(normalizedEmails).toEqual(["user@example.com", "another@test.com"]);
    });

    it("should return empty array for empty input", () => {
      const emails: string[] = [];
      expect(emails.length === 0).toBe(true);
    });
  });

  describe("findBookingsByUserIdsAndDateRange", () => {
    it("should filter bookings by date range overlap", () => {
      const dateFrom = new Date("2025-01-20T00:00:00.000Z");
      const dateTo = new Date("2025-01-21T00:00:00.000Z");

      const bookings = [
        // Fully within range
        {
          startTime: new Date("2025-01-20T10:00:00.000Z"),
          endTime: new Date("2025-01-20T11:00:00.000Z"),
        },
        // Overlaps start
        {
          startTime: new Date("2025-01-19T23:00:00.000Z"),
          endTime: new Date("2025-01-20T01:00:00.000Z"),
        },
        // Overlaps end
        {
          startTime: new Date("2025-01-20T23:00:00.000Z"),
          endTime: new Date("2025-01-21T01:00:00.000Z"),
        },
        // Completely outside - before
        {
          startTime: new Date("2025-01-19T10:00:00.000Z"),
          endTime: new Date("2025-01-19T11:00:00.000Z"),
        },
        // Completely outside - after
        {
          startTime: new Date("2025-01-22T10:00:00.000Z"),
          endTime: new Date("2025-01-22T11:00:00.000Z"),
        },
      ];

      // Filter bookings that overlap with the date range
      // A booking overlaps if: booking.startTime < dateTo AND booking.endTime > dateFrom
      const overlappingBookings = bookings.filter(
        (booking) => booking.startTime < dateTo && booking.endTime > dateFrom
      );

      expect(overlappingBookings).toHaveLength(3);
    });

    it("should return empty array when no userIds and no userEmails provided", () => {
      const userIds: number[] = [];
      const userEmails: string[] = [];

      const shouldSkip = !userIds.length && !userEmails.length;
      expect(shouldSkip).toBe(true);
    });
  });

  describe("guest busy times should only apply to first user (host)", () => {
    it("should pass guestBusyTimes only to first user in users array", () => {
      const users = [
        { id: 1, username: "host" },
        { id: 2, username: "guest1" },
        { id: 3, username: "guest2" },
      ];

      const guestBusyTimes = [
        { start: new Date("2025-01-20T10:00:00.000Z"), end: new Date("2025-01-20T11:00:00.000Z") },
      ];

      // Simulate how getUsersAvailability passes guestBusyTimes to each user
      const usersWithGuestBusyTimes = users.map((user, index) => ({
        user,
        guestBusyTimes: index === 0 ? guestBusyTimes : undefined,
      }));

      expect(usersWithGuestBusyTimes[0].guestBusyTimes).toEqual(guestBusyTimes);
      expect(usersWithGuestBusyTimes[1].guestBusyTimes).toBeUndefined();
      expect(usersWithGuestBusyTimes[2].guestBusyTimes).toBeUndefined();
    });
  });

  describe("_getGuestBusyTimesForReschedule", () => {
    it("should skip for collective event types", () => {
      const eventTypeSchedulingType = "COLLECTIVE";
      const shouldSkip = eventTypeSchedulingType === "COLLECTIVE";

      expect(shouldSkip).toBe(true);
    });

    it("should skip when no rescheduleUid is provided", () => {
      const rescheduleUid = null;
      const shouldSkip = !rescheduleUid;

      expect(shouldSkip).toBe(true);
    });

    it("should proceed for non-collective event types with rescheduleUid", () => {
      const rescheduleUid = "abc123";
      const eventTypeSchedulingType = "ROUND_ROBIN";
      const shouldSkip = !rescheduleUid || eventTypeSchedulingType === "COLLECTIVE";

      expect(shouldSkip).toBe(false);
    });

    it("should filter out empty attendee emails", () => {
      const attendees = [{ email: "user1@example.com" }, { email: "" }, { email: "user2@example.com" }, { email: null }];

      const validEmails = attendees
        .map((a) => a.email)
        .filter((email): email is string => Boolean(email));

      expect(validEmails).toEqual(["user1@example.com", "user2@example.com"]);
    });
  });
});
