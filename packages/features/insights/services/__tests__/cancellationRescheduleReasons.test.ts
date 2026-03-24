import { describe, it, expect, vi, beforeEach } from "vitest";

import { InsightsBookingBaseService } from "../InsightsBookingBaseService";

const mockQueryRaw = vi.fn();
const mockFindMany = vi.fn();

const mockPrisma = {
  $queryRaw: mockQueryRaw,
  bookingTimeStatusDenormalized: {
    findMany: mockFindMany,
  },
  team: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  membership: {
    findMany: vi.fn().mockResolvedValue([]),
  },
} as unknown as Parameters<typeof createService>[0]["prisma"];

function createService(
  overrides: Partial<{
    prisma: typeof mockPrisma;
    options: { scope: string; userId?: number; teamId?: number; orgId?: number };
    filters: { columnFilters?: unknown[] };
  }> = {}
) {
  return new InsightsBookingBaseService({
    prisma: overrides.prisma ?? mockPrisma,
    options: overrides.options ?? { scope: "user", userId: 1 },
    filters: overrides.filters ?? { columnFilters: [] },
  });
}

describe("InsightsBookingBaseService - Cancellation & Reschedule Reason Stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCancellationReasonStats", () => {
    it("should return aggregated cancellation reasons", async () => {
      const mockResults = [
        { reason: "Schedule conflict", count: 15 },
        { reason: "No longer needed", count: 8 },
        { reason: "Found alternative", count: 3 },
      ];
      mockQueryRaw.mockResolvedValue(mockResults);

      const service = createService();
      const result = await service.getCancellationReasonStats();

      expect(result).toEqual(mockResults);
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no cancellation reasons exist", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const service = createService();
      const result = await service.getCancellationReasonStats();

      expect(result).toEqual([]);
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it("should pass the query with cancelled timeStatus filter", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const service = createService();
      await service.getCancellationReasonStats();

      const queryArg = mockQueryRaw.mock.calls[0][0];
      const queryString = queryArg.strings.join("");

      expect(queryString).toContain('"timeStatus" = \'cancelled\'');
      expect(queryString).toContain('"cancellationReason" IS NOT NULL');
      expect(queryString).toContain("GROUP BY");
      expect(queryString).toContain("ORDER BY");
      expect(queryString).toContain("LIMIT 10");
    });
  });

  describe("getRescheduleReasonStats", () => {
    it("should return aggregated reschedule reasons", async () => {
      const mockResults = [
        { reason: "Time change requested", count: 12 },
        { reason: "Conflict arose", count: 6 },
      ];
      mockQueryRaw.mockResolvedValue(mockResults);

      const service = createService();
      const result = await service.getRescheduleReasonStats();

      expect(result).toEqual(mockResults);
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no reschedule reasons exist", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const service = createService();
      const result = await service.getRescheduleReasonStats();

      expect(result).toEqual([]);
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it("should pass the query with rescheduled timeStatus filter", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const service = createService();
      await service.getRescheduleReasonStats();

      const queryArg = mockQueryRaw.mock.calls[0][0];
      const queryString = queryArg.strings.join("");

      expect(queryString).toContain('"timeStatus" = \'rescheduled\'');
      expect(queryString).toContain('"cancellationReason" IS NOT NULL');
      expect(queryString).toContain("GROUP BY");
      expect(queryString).toContain("ORDER BY");
      expect(queryString).toContain("LIMIT 10");
    });
  });

  describe("cancellation vs reschedule distinction", () => {
    it("should use different timeStatus filters for cancellation and reschedule", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const service = createService();

      await service.getCancellationReasonStats();
      const cancellationQuery = mockQueryRaw.mock.calls[0][0].strings.join("");

      await service.getRescheduleReasonStats();
      const rescheduleQuery = mockQueryRaw.mock.calls[1][0].strings.join("");

      expect(cancellationQuery).toContain("'cancelled'");
      expect(cancellationQuery).not.toContain("'rescheduled'");

      expect(rescheduleQuery).toContain("'rescheduled'");
      expect(rescheduleQuery).not.toContain("'cancelled'");
    });
  });
});
