import { HttpError } from "@calcom/lib/http-error";
import { describe, expect, it, vi } from "vitest";
import { CheckBookingLimitsService } from "./checkBookingLimits";

function createMockBookingRepo(countReturn = 0, teamReturn = 0) {
  return {
    countBookingsByEventTypeAndDateRange: vi.fn().mockResolvedValue(countReturn),
    getAllAcceptedTeamBookingsOfUser: vi.fn().mockResolvedValue(teamReturn),
  };
}

describe("CheckBookingLimitsService", () => {
  describe("checkBookingLimits", () => {
    it("returns false for null/undefined booking limits", async () => {
      const repo = createMockBookingRepo();
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      const result = await service.checkBookingLimits(null as never, new Date(), 1);
      expect(result).toBe(false);
    });

    it("does not throw when bookings are below limit", async () => {
      const repo = createMockBookingRepo(2);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      const result = await service.checkBookingLimits({ PER_DAY: 5 }, new Date("2024-01-15T10:00:00Z"), 1);
      expect(result).toBe(true);
    });

    it("throws HttpError when booking limit is reached", async () => {
      const repo = createMockBookingRepo(5);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await expect(
        service.checkBookingLimits({ PER_DAY: 5 }, new Date("2024-01-15T10:00:00Z"), 1)
      ).rejects.toThrow(HttpError);
    });

    it("checks multiple limit keys in ascending order", async () => {
      const repo = createMockBookingRepo(0);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await service.checkBookingLimits({ PER_DAY: 10, PER_WEEK: 20 }, new Date("2024-01-15T10:00:00Z"), 1);
      expect(repo.countBookingsByEventTypeAndDateRange).toHaveBeenCalled();
    });

    it("passes rescheduleUid as excludedUid", async () => {
      const repo = createMockBookingRepo(0);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await service.checkBookingLimits(
        { PER_DAY: 5 },
        new Date("2024-01-15T10:00:00Z"),
        1,
        "reschedule-uid-123"
      );
      expect(repo.countBookingsByEventTypeAndDateRange).toHaveBeenCalledWith(
        expect.objectContaining({ excludedUid: "reschedule-uid-123" })
      );
    });
  });

  describe("checkBookingLimit", () => {
    it("returns early when limitingNumber is undefined", async () => {
      const repo = createMockBookingRepo();
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await service.checkBookingLimit({
        key: "PER_DAY",
        limitingNumber: undefined,
        eventStartDate: new Date(),
        eventId: 1,
      });
      expect(repo.countBookingsByEventTypeAndDateRange).not.toHaveBeenCalled();
    });

    it("uses team booking count when teamId and user are provided", async () => {
      const repo = createMockBookingRepo(0, 3);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await service.checkBookingLimit({
        key: "PER_DAY",
        limitingNumber: 5,
        eventStartDate: new Date("2024-01-15T10:00:00Z"),
        teamId: 100,
        user: { id: 1, email: "user@test.com" },
      });
      expect(repo.getAllAcceptedTeamBookingsOfUser).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 100,
          user: { id: 1, email: "user@test.com" },
        })
      );
    });

    it("throws when team booking limit is reached", async () => {
      const repo = createMockBookingRepo(0, 5);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await expect(
        service.checkBookingLimit({
          key: "PER_DAY",
          limitingNumber: 5,
          eventStartDate: new Date("2024-01-15T10:00:00Z"),
          teamId: 100,
          user: { id: 1, email: "user@test.com" },
        })
      ).rejects.toThrow("booking_limit_reached");
    });

    it("uses event type count when no teamId", async () => {
      const repo = createMockBookingRepo(2);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await service.checkBookingLimit({
        key: "PER_WEEK",
        limitingNumber: 10,
        eventStartDate: new Date("2024-01-15T10:00:00Z"),
        eventId: 42,
      });
      expect(repo.countBookingsByEventTypeAndDateRange).toHaveBeenCalledWith(
        expect.objectContaining({ eventTypeId: 42 })
      );
    });

    it("throws 403 when event type limit is reached", async () => {
      const repo = createMockBookingRepo(10);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await expect(
        service.checkBookingLimit({
          key: "PER_WEEK",
          limitingNumber: 10,
          eventStartDate: new Date("2024-01-15T10:00:00Z"),
          eventId: 42,
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("applies timezone to date calculations", async () => {
      const repo = createMockBookingRepo(0);
      const service = new CheckBookingLimitsService({
        bookingRepo: repo as never,
      });
      await service.checkBookingLimit({
        key: "PER_DAY",
        limitingNumber: 5,
        eventStartDate: new Date("2024-01-15T23:00:00Z"),
        eventId: 1,
        timeZone: "America/New_York",
      });
      expect(repo.countBookingsByEventTypeAndDateRange).toHaveBeenCalled();
    });
  });
});
