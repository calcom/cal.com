import { describe, expect, it, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { DateRange } from "../../server/insightsDateUtils";
import { InsightsBookingBaseService } from "../InsightsBookingBaseService";

const mockPrisma = {
  $queryRaw: vi.fn(),
} as unknown as PrismaClient;

describe("InsightsBookingBaseService - Timezone Parsing Fix", () => {
  let service: InsightsBookingBaseService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new InsightsBookingBaseService({
      prisma: mockPrisma,
      options: {
        scope: "user",
        userId: 1,
        orgId: null,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, "getAuthorizationConditions").mockResolvedValue(
      Prisma.sql`"userId" = 1 AND "teamId" IS NULL`
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, "getFilterConditions").mockResolvedValue(null);
  });

  describe("Date parsing with dayjs.tz", () => {
    it("should parse dates correctly using dayjs.tz instead of dayjs().tz()", () => {
      const dateString = "2025-01-15";
      const timeZone = "America/New_York";

      const newWay = dayjs.tz(dateString, timeZone).startOf("day").toDate();

      expect(newWay.toISOString()).toContain("2025-01-15");

      expect(newWay.toISOString()).toBe("2025-01-15T05:00:00.000Z");
    });

    it("should parse dates correctly for Asia/Tokyo timezone", () => {
      const dateString = "2025-01-15";
      const timeZone = "Asia/Tokyo";

      const parsed = dayjs.tz(dateString, timeZone).startOf("day").toDate();

      expect(parsed.toISOString()).toBe("2025-01-14T15:00:00.000Z");
    });

    it("should parse dates correctly for UTC timezone", () => {
      const dateString = "2025-01-15";
      const timeZone = "UTC";

      const parsed = dayjs.tz(dateString, timeZone).startOf("day").toDate();

      expect(parsed.toISOString()).toBe("2025-01-15T00:00:00.000Z");
    });
  });

  describe("getEventTrendsStats", () => {
    it("should correctly match dates to date ranges for America/New_York", async () => {
      const timeZone = "America/New_York";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-15T05:00:00.000Z", // Midnight Jan 15 in NY
          endDate: "2025-01-16T04:59:59.999Z", // Just before midnight Jan 16 in NY
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-15", // SQL returns bare date string
          bookingsCount: 5,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getEventTrendsStats({ timeZone, dateRanges });

      expect(result).toHaveLength(1);
      expect(result[0].Completed).toBe(5);
      expect(result[0].Month).toBe("Jan 15");
    });

    it("should correctly match dates to date ranges for Asia/Tokyo", async () => {
      const timeZone = "Asia/Tokyo";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-14T15:00:00.000Z", // Midnight Jan 15 in Tokyo
          endDate: "2025-01-15T14:59:59.999Z", // Just before midnight Jan 16 in Tokyo
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-15", // SQL returns bare date string
          bookingsCount: 3,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getEventTrendsStats({ timeZone, dateRanges });

      expect(result).toHaveLength(1);
      expect(result[0].Completed).toBe(3);
      expect(result[0].Month).toBe("Jan 15");
    });
  });

  describe("getNoShowHostsOverTimeStats", () => {
    it("should correctly match dates to date ranges for America/New_York", async () => {
      const timeZone = "America/New_York";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-15T05:00:00.000Z",
          endDate: "2025-01-16T04:59:59.999Z",
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-15", // SQL returns bare date string
          count: 2,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getNoShowHostsOverTimeStats({ timeZone, dateRanges });

      expect(result).toHaveLength(1);
      expect(result[0].Count).toBe(2);
      expect(result[0].Month).toBe("Jan 15");
    });

    it("should correctly match dates to date ranges for Asia/Tokyo", async () => {
      const timeZone = "Asia/Tokyo";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-14T15:00:00.000Z",
          endDate: "2025-01-15T14:59:59.999Z",
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-15", // SQL returns bare date string
          count: 4,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getNoShowHostsOverTimeStats({ timeZone, dateRanges });

      expect(result).toHaveLength(1);
      expect(result[0].Count).toBe(4);
      expect(result[0].Month).toBe("Jan 15");
    });
  });

  describe("getCSATOverTimeStats", () => {
    it("should correctly match dates to date ranges for America/New_York", async () => {
      const timeZone = "America/New_York";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-15T05:00:00.000Z",
          endDate: "2025-01-16T04:59:59.999Z",
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-15", // SQL returns bare date string
          ratings_above_3: 8,
          total_ratings: 10,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getCSATOverTimeStats({ timeZone, dateRanges });

      expect(result).toHaveLength(1);
      expect(result[0].CSAT).toBe(80.0);
      expect(result[0].Month).toBe("Jan 15");
    });

    it("should correctly match dates to date ranges for Asia/Tokyo", async () => {
      const timeZone = "Asia/Tokyo";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-14T15:00:00.000Z",
          endDate: "2025-01-15T14:59:59.999Z",
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-15", // SQL returns bare date string
          ratings_above_3: 7,
          total_ratings: 10,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getCSATOverTimeStats({ timeZone, dateRanges });

      expect(result).toHaveLength(1);
      expect(result[0].CSAT).toBe(70.0);
      expect(result[0].Month).toBe("Jan 15");
    });
  });

  describe("Edge cases", () => {
    it("should handle multiple date ranges correctly", async () => {
      const timeZone = "America/New_York";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-14T05:00:00.000Z",
          endDate: "2025-01-15T04:59:59.999Z",
          formattedDate: "Jan 14",
          formattedDateFull: "Jan 14, 2025",
        },
        {
          startDate: "2025-01-15T05:00:00.000Z",
          endDate: "2025-01-16T04:59:59.999Z",
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-14", // SQL returns bare date string
          bookingsCount: 2,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
        {
          date: "2025-01-15", // SQL returns bare date string
          bookingsCount: 3,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getEventTrendsStats({ timeZone, dateRanges });

      expect(result).toHaveLength(2);
      expect(result[0].Completed).toBe(2);
      expect(result[0].Month).toBe("Jan 14");
      expect(result[1].Completed).toBe(3);
      expect(result[1].Month).toBe("Jan 15");
    });

    it("should return zero counts for date ranges with no data", async () => {
      const timeZone = "America/New_York";

      const dateRanges: DateRange[] = [
        {
          startDate: "2025-01-15T05:00:00.000Z",
          endDate: "2025-01-16T04:59:59.999Z",
          formattedDate: "Jan 15",
          formattedDateFull: "Jan 15, 2025",
        },
        {
          startDate: "2025-01-16T05:00:00.000Z",
          endDate: "2025-01-17T04:59:59.999Z",
          formattedDate: "Jan 16",
          formattedDateFull: "Jan 16, 2025",
        },
      ];

      const mockData = [
        {
          date: "2025-01-15", // SQL returns bare date string
          count: 3,
        },
      ];

      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getNoShowHostsOverTimeStats({ timeZone, dateRanges });

      expect(result).toHaveLength(2);
      expect(result[0].Count).toBe(3);
      expect(result[0].Month).toBe("Jan 15");
      expect(result[1].Count).toBe(0);
      expect(result[1].Month).toBe("Jan 16");
    });
  });
});
