import { BookingReportReason, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminWatchlistQueryService } from "./AdminWatchlistQueryService";

vi.mock("@calcom/prisma", () => ({ default: {}, prisma: {} }));

function createMockDeps() {
  return {
    watchlistRepo: {
      countOrgEntriesForValue: vi.fn().mockResolvedValue(0),
      findTeamNamesByIds: vi.fn().mockResolvedValue([]),
      findAllEntriesWithLatestAudit: vi.fn(),
      findEntryWithAuditAndReports: vi.fn(),
    },
    bookingReportRepo: {
      getReportReasonCounts: vi.fn().mockResolvedValue([]),
      countReportsPerOrg: vi.fn().mockResolvedValue(new Map()),
      findGroupedReportedBookings: vi.fn(),
      countSystemPendingReports: vi.fn(),
    },
    bookingRepo: {
      getBookingStatsByAttendee: vi.fn().mockResolvedValue([]),
      countBookingsByAttendee: vi.fn().mockResolvedValue(0),
      countDistinctHostsByAttendee: vi.fn().mockResolvedValue(0),
      getTopOrgsByAttendeeBookings: vi.fn().mockResolvedValue({ topOrgs: [], totalOrgCount: 0 }),
    },
    userRepo: {
      findUsersByIds: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Parameters<typeof AdminWatchlistQueryService.prototype.getEntryImpact extends (...args: infer A) => unknown ? never : never> &
    ConstructorParameters<typeof AdminWatchlistQueryService>[0];
}

type MockDeps = ReturnType<typeof createMockDeps>;

function createService(deps: MockDeps) {
  return new AdminWatchlistQueryService(deps as ConstructorParameters<typeof AdminWatchlistQueryService>[0]);
}

describe("AdminWatchlistQueryService.getEntryImpact", () => {
  let deps: MockDeps;
  let service: AdminWatchlistQueryService;

  beforeEach(() => {
    deps = createMockDeps();
    service = createService(deps);
  });

  describe("email type", () => {
    it("uses exact email match for attendee queries", async () => {
      await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "spam@evil.com" });

      expect(deps.bookingRepo.getBookingStatsByAttendee).toHaveBeenCalledWith(
        expect.objectContaining({ attendeeWhere: { email: "spam@evil.com" } })
      );
      expect(deps.bookingRepo.countBookingsByAttendee).toHaveBeenCalledWith(
        expect.objectContaining({ attendeeWhere: { email: "spam@evil.com" } })
      );
      expect(deps.bookingRepo.countDistinctHostsByAttendee).toHaveBeenCalledWith(
        expect.objectContaining({ attendeeWhere: { email: "spam@evil.com" } })
      );
    });

    it("passes isExactEmail=true for report queries", async () => {
      await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "spam@evil.com" });

      expect(deps.bookingReportRepo.getReportReasonCounts).toHaveBeenCalledWith(
        expect.objectContaining({ email: "spam@evil.com", isExactEmail: true })
      );
    });
  });

  describe("domain type", () => {
    it("uses endsWith match for attendee queries", async () => {
      await service.getEntryImpact({ type: WatchlistType.DOMAIN, value: "evil.com" });

      expect(deps.bookingRepo.getBookingStatsByAttendee).toHaveBeenCalledWith(
        expect.objectContaining({ attendeeWhere: { email: { endsWith: "@evil.com" } } })
      );
    });

    it("passes isExactEmail=false and prefixed email for report queries", async () => {
      await service.getEntryImpact({ type: WatchlistType.DOMAIN, value: "evil.com" });

      expect(deps.bookingReportRepo.getReportReasonCounts).toHaveBeenCalledWith(
        expect.objectContaining({ email: "@evil.com", isExactEmail: false })
      );
    });
  });

  describe("booking stats aggregation", () => {
    it("sums booking counts by status and computes total", async () => {
      deps.bookingRepo.getBookingStatsByAttendee.mockResolvedValue([
        { status: "ACCEPTED", _count: { id: 10 } },
        { status: "CANCELLED", _count: { id: 3 } },
        { status: "REJECTED", _count: { id: 2 } },
        { status: "PENDING", _count: { id: 1 } },
      ]);

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.totalBookings).toBe(16);
      expect(result.statusBreakdown).toEqual({
        accepted: 10,
        cancelled: 3,
        rejected: 2,
        pending: 1,
        awaitingHost: 0,
      });
    });

    it("ignores unknown status values gracefully", async () => {
      deps.bookingRepo.getBookingStatsByAttendee.mockResolvedValue([
        { status: "ACCEPTED", _count: { id: 5 } },
        { status: "UNKNOWN_STATUS", _count: { id: 2 } },
      ]);

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.totalBookings).toBe(7);
      expect(result.statusBreakdown.accepted).toBe(5);
    });
  });

  describe("report data aggregation", () => {
    it("maps report reasons correctly", async () => {
      deps.bookingReportRepo.getReportReasonCounts.mockResolvedValue([
        { reason: BookingReportReason.SPAM, _count: { id: 5 } },
        { reason: BookingReportReason.DONT_KNOW_PERSON, _count: { id: 3 } },
        { reason: "OTHER", _count: { id: 1 } },
      ]);

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.reportCount).toBe(9);
      expect(result.reportsByReason).toEqual({ spam: 5, dontKnowPerson: 3, other: 1 });
    });

    it("returns zeroes when no reports exist", async () => {
      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "clean@good.com" });

      expect(result.reportCount).toBe(0);
      expect(result.reportsByReason).toEqual({ spam: 0, dontKnowPerson: 0, other: 0 });
    });
  });

  describe("organization resolution", () => {
    it("resolves org names and enriches with report counts", async () => {
      deps.bookingRepo.getTopOrgsByAttendeeBookings.mockResolvedValue({
        topOrgs: [
          { organizationId: 1, bookingCount: 10 },
          { organizationId: 2, bookingCount: 5 },
        ],
        totalOrgCount: 2,
      });
      deps.watchlistRepo.findTeamNamesByIds.mockResolvedValue([
        { id: 1, name: "Acme Inc" },
        { id: 2, name: "Globex Corp" },
      ]);
      deps.bookingReportRepo.countReportsPerOrg.mockResolvedValue(
        new Map([
          [1, 4],
          [2, 0],
        ])
      );

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.affectedOrgCount).toBe(2);
      expect(result.topAffectedOrgs).toEqual([
        { id: 1, name: "Acme Inc", bookingCount: 10, reportCount: 4 },
        { id: 2, name: "Globex Corp", bookingCount: 5, reportCount: 0 },
      ]);
    });

    it("returns 'Unknown' for orgs that cannot be resolved", async () => {
      deps.bookingRepo.getTopOrgsByAttendeeBookings.mockResolvedValue({
        topOrgs: [{ organizationId: 99, bookingCount: 3 }],
        totalOrgCount: 1,
      });
      deps.watchlistRepo.findTeamNamesByIds.mockResolvedValue([]);

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.topAffectedOrgs[0].name).toBe("Unknown");
    });

    it("reports totalOrgCount from the booking query, not just top orgs length", async () => {
      deps.bookingRepo.getTopOrgsByAttendeeBookings.mockResolvedValue({
        topOrgs: [{ organizationId: 1, bookingCount: 10 }],
        totalOrgCount: 7,
      });
      deps.watchlistRepo.findTeamNamesByIds.mockResolvedValue([{ id: 1, name: "Org" }]);

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.affectedOrgCount).toBe(7);
      expect(result.topAffectedOrgs).toHaveLength(1);
    });
  });

  describe("full return shape", () => {
    it("includes all expected fields with correct defaults", async () => {
      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "clean@good.com" });

      expect(result).toEqual({
        totalBookings: 0,
        recentBookings: 0,
        distinctHostCount: 0,
        affectedOrgCount: 0,
        reportCount: 0,
        reportsByReason: { spam: 0, dontKnowPerson: 0, other: 0 },
        existingOrgBlockCount: 0,
        statusBreakdown: { accepted: 0, cancelled: 0, rejected: 0, pending: 0, awaitingHost: 0 },
        topAffectedOrgs: [],
      });
    });

    it("passes recentBookings from 7-day count", async () => {
      deps.bookingRepo.countBookingsByAttendee.mockResolvedValue(42);

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.recentBookings).toBe(42);
    });

    it("passes existingOrgBlockCount from watchlist repo", async () => {
      deps.watchlistRepo.countOrgEntriesForValue.mockResolvedValue(3);

      const result = await service.getEntryImpact({ type: WatchlistType.EMAIL, value: "x@y.com" });

      expect(result.existingOrgBlockCount).toBe(3);
    });
  });
});
