import type { Prisma } from "@calcom/prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { DateRange } from "../../server/insightsDateUtils";
import {
  InsightsBookingBaseService,
  type InsightsBookingServicePublicOptions,
} from "../InsightsBookingBaseService";

const mockDateRanges: DateRange[] = [
  {
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2025-01-31T23:59:59.999Z",
    formattedDate: "Jan",
    formattedDateFull: "Jan",
  },
  {
    startDate: "2025-02-01T00:00:00.000Z",
    endDate: "2025-02-28T23:59:59.999Z",
    formattedDate: "Feb",
    formattedDateFull: "Feb",
  },
];

const defaultOptions: InsightsBookingServicePublicOptions = {
  scope: "user",
  userId: 1,
  orgId: null,
};

function createServiceWithQueryCapture(mockData?: Record<string, unknown>[]) {
  const capturedQueries: Prisma.Sql[] = [];

  const mockPrisma = {
    $queryRaw: vi.fn().mockImplementation((query: Prisma.Sql) => {
      capturedQueries.push(query);
      return Promise.resolve(mockData ?? []);
    }),
    membership: { findFirst: vi.fn().mockResolvedValue(null) },
    team: { findMany: vi.fn().mockResolvedValue([]) },
  };

  const service = new InsightsBookingBaseService({
    prisma: mockPrisma as never,
    options: defaultOptions,
  });

  return { service, capturedQueries };
}

function sqlContainsColumn(sql: Prisma.Sql, column: string): boolean {
  return sql.strings.some((s) => s.includes(column));
}

describe("InsightsBookingBaseService dateTarget parameter", () => {
  describe("getEventTrendsStats", () => {
    it("should use createdAt column when dateTarget is createdAt (default)", async () => {
      const { service, capturedQueries } = createServiceWithQueryCapture();

      await service.getEventTrendsStats({
        timeZone: "UTC",
        dateRanges: mockDateRanges,
      });

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      expect(sqlContainsColumn(query, '"createdAt"')).toBe(true);
      expect(sqlContainsColumn(query, '"startTime"')).toBe(false);
    });

    it("should use createdAt column when dateTarget is explicitly createdAt", async () => {
      const { service, capturedQueries } = createServiceWithQueryCapture();

      await service.getEventTrendsStats({
        timeZone: "UTC",
        dateRanges: mockDateRanges,
        dateTarget: "createdAt",
      });

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      expect(sqlContainsColumn(query, '"createdAt"')).toBe(true);
      expect(sqlContainsColumn(query, '"startTime"')).toBe(false);
    });

    it("should use startTime column when dateTarget is startTime", async () => {
      const { service, capturedQueries } = createServiceWithQueryCapture();

      await service.getEventTrendsStats({
        timeZone: "UTC",
        dateRanges: mockDateRanges,
        dateTarget: "startTime",
      });

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      expect(sqlContainsColumn(query, '"startTime"')).toBe(true);
      expect(sqlContainsColumn(query, '"createdAt"')).toBe(false);
    });

    it("should return empty array when dateRanges is empty", async () => {
      const { service } = createServiceWithQueryCapture();

      const result = await service.getEventTrendsStats({
        timeZone: "UTC",
        dateRanges: [],
      });

      expect(result).toEqual([]);
    });
  });

  describe("getNoShowHostsOverTimeStats", () => {
    it("should use createdAt column when dateTarget is createdAt (default)", async () => {
      const { service, capturedQueries } = createServiceWithQueryCapture();

      await service.getNoShowHostsOverTimeStats({
        timeZone: "UTC",
        dateRanges: mockDateRanges,
      });

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      expect(sqlContainsColumn(query, '"createdAt"')).toBe(true);
      expect(sqlContainsColumn(query, '"startTime"')).toBe(false);
    });

    it("should use startTime column when dateTarget is startTime", async () => {
      const { service, capturedQueries } = createServiceWithQueryCapture();

      await service.getNoShowHostsOverTimeStats({
        timeZone: "UTC",
        dateRanges: mockDateRanges,
        dateTarget: "startTime",
      });

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      expect(sqlContainsColumn(query, '"startTime"')).toBe(true);
      expect(sqlContainsColumn(query, '"createdAt"')).toBe(false);
    });

    it("should return empty array when dateRanges is empty", async () => {
      const { service } = createServiceWithQueryCapture();

      const result = await service.getNoShowHostsOverTimeStats({
        timeZone: "UTC",
        dateRanges: [],
      });

      expect(result).toEqual([]);
    });
  });

  describe("getCSATOverTimeStats", () => {
    it("should use createdAt column when dateTarget is createdAt (default)", async () => {
      const { service, capturedQueries } = createServiceWithQueryCapture();

      await service.getCSATOverTimeStats({
        timeZone: "UTC",
        dateRanges: mockDateRanges,
      });

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      expect(sqlContainsColumn(query, '"createdAt"')).toBe(true);
      expect(sqlContainsColumn(query, '"startTime"')).toBe(false);
    });

    it("should use startTime column when dateTarget is startTime", async () => {
      const { service, capturedQueries } = createServiceWithQueryCapture();

      await service.getCSATOverTimeStats({
        timeZone: "UTC",
        dateRanges: mockDateRanges,
        dateTarget: "startTime",
      });

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      expect(sqlContainsColumn(query, '"startTime"')).toBe(true);
      expect(sqlContainsColumn(query, '"createdAt"')).toBe(false);
    });

    it("should return empty array when dateRanges is empty", async () => {
      const { service } = createServiceWithQueryCapture();

      const result = await service.getCSATOverTimeStats({
        timeZone: "UTC",
        dateRanges: [],
      });

      expect(result).toEqual([]);
    });
  });
});

describe("InsightsBookingBaseService timezone date matching", () => {
  // Simulates the real-world scenario: America/New_York (UTC-5).
  // Date ranges are midnight-to-midnight in the user's timezone,
  // which means their UTC representations are offset by 5 hours.
  const nycDailyRanges: DateRange[] = [
    {
      startDate: "2026-02-10T05:00:00.000Z",
      endDate: "2026-02-11T04:59:59.999Z",
      formattedDate: "Feb 10",
      formattedDateFull: "Feb 10",
    },
    {
      startDate: "2026-02-11T05:00:00.000Z",
      endDate: "2026-02-12T04:59:59.999Z",
      formattedDate: "11",
      formattedDateFull: "Feb 11",
    },
    {
      startDate: "2026-02-12T05:00:00.000Z",
      endDate: "2026-02-13T04:59:59.999Z",
      formattedDate: "12",
      formattedDateFull: "Feb 12",
    },
  ];

  describe("getEventTrendsStats - timezone date matching", () => {
    it("should correctly map SQL dates to date ranges with negative UTC offset", async () => {
      const mockData = [
        {
          date: new Date("2026-02-10T00:00:00.000Z"),
          bookingsCount: 3,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
        {
          date: new Date("2026-02-11T00:00:00.000Z"),
          bookingsCount: 2,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
        {
          date: new Date("2026-02-12T00:00:00.000Z"),
          bookingsCount: 1,
          timeStatus: "cancelled",
          noShowHost: false,
          noShowGuests: 0,
        },
      ];

      const { service } = createServiceWithQueryCapture(mockData);
      const result = await service.getEventTrendsStats({
        timeZone: "America/New_York",
        dateRanges: nycDailyRanges,
      });

      expect(result).toHaveLength(3);
      expect(result[0].Created).toBe(3);
      expect(result[0].formattedDateFull).toBe("Feb 10");
      expect(result[1].Created).toBe(2);
      expect(result[1].formattedDateFull).toBe("Feb 11");
      expect(result[2].Created).toBe(1);
      expect(result[2].formattedDateFull).toBe("Feb 12");
    });

    it("should not drop bookings on the first day of the range", async () => {
      const mockData = [
        {
          date: new Date("2026-02-10T00:00:00.000Z"),
          bookingsCount: 5,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
      ];

      const { service } = createServiceWithQueryCapture(mockData);
      const result = await service.getEventTrendsStats({
        timeZone: "America/New_York",
        dateRanges: nycDailyRanges,
      });

      expect(result[0].Created).toBe(5);
      expect(result[0].formattedDateFull).toBe("Feb 10");
    });

    it("should handle positive UTC offset (e.g. Asia/Tokyo UTC+9)", async () => {
      const tokyoDailyRanges: DateRange[] = [
        {
          startDate: "2026-02-09T15:00:00.000Z",
          endDate: "2026-02-10T14:59:59.999Z",
          formattedDate: "Feb 10",
          formattedDateFull: "Feb 10",
        },
        {
          startDate: "2026-02-10T15:00:00.000Z",
          endDate: "2026-02-11T14:59:59.999Z",
          formattedDate: "11",
          formattedDateFull: "Feb 11",
        },
      ];

      const mockData = [
        {
          date: new Date("2026-02-10T00:00:00.000Z"),
          bookingsCount: 4,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
        {
          date: new Date("2026-02-11T00:00:00.000Z"),
          bookingsCount: 2,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
      ];

      const { service } = createServiceWithQueryCapture(mockData);
      const result = await service.getEventTrendsStats({
        timeZone: "Asia/Tokyo",
        dateRanges: tokyoDailyRanges,
      });

      expect(result[0].Created).toBe(4);
      expect(result[0].formattedDateFull).toBe("Feb 10");
      expect(result[1].Created).toBe(2);
      expect(result[1].formattedDateFull).toBe("Feb 11");
    });

    it("should work correctly with UTC timezone", async () => {
      const utcDailyRanges: DateRange[] = [
        {
          startDate: "2026-02-10T00:00:00.000Z",
          endDate: "2026-02-10T23:59:59.999Z",
          formattedDate: "Feb 10",
          formattedDateFull: "Feb 10",
        },
        {
          startDate: "2026-02-11T00:00:00.000Z",
          endDate: "2026-02-11T23:59:59.999Z",
          formattedDate: "11",
          formattedDateFull: "Feb 11",
        },
      ];

      const mockData = [
        {
          date: new Date("2026-02-10T00:00:00.000Z"),
          bookingsCount: 3,
          timeStatus: "completed",
          noShowHost: false,
          noShowGuests: 0,
        },
        {
          date: new Date("2026-02-11T00:00:00.000Z"),
          bookingsCount: 1,
          timeStatus: "cancelled",
          noShowHost: false,
          noShowGuests: 0,
        },
      ];

      const { service } = createServiceWithQueryCapture(mockData);
      const result = await service.getEventTrendsStats({
        timeZone: "UTC",
        dateRanges: utcDailyRanges,
      });

      expect(result[0].Created).toBe(3);
      expect(result[1].Created).toBe(1);
    });
  });

  describe("getNoShowHostsOverTimeStats - timezone date matching", () => {
    it("should correctly map SQL dates with negative UTC offset", async () => {
      const mockData = [
        { date: new Date("2026-02-10T00:00:00.000Z"), count: 2 },
        { date: new Date("2026-02-11T00:00:00.000Z"), count: 1 },
      ];

      const { service } = createServiceWithQueryCapture(mockData);
      const result = await service.getNoShowHostsOverTimeStats({
        timeZone: "America/New_York",
        dateRanges: nycDailyRanges,
      });

      expect(result[0].Count).toBe(2);
      expect(result[0].formattedDateFull).toBe("Feb 10");
      expect(result[1].Count).toBe(1);
      expect(result[1].formattedDateFull).toBe("Feb 11");
    });
  });

  describe("getCSATOverTimeStats - timezone date matching", () => {
    it("should correctly map SQL dates with negative UTC offset", async () => {
      const mockData = [
        { date: new Date("2026-02-10T00:00:00.000Z"), ratings_above_3: 3, total_ratings: 4 },
        { date: new Date("2026-02-11T00:00:00.000Z"), ratings_above_3: 1, total_ratings: 2 },
      ];

      const { service } = createServiceWithQueryCapture(mockData);
      const result = await service.getCSATOverTimeStats({
        timeZone: "America/New_York",
        dateRanges: nycDailyRanges,
      });

      expect(result[0].CSAT).toBe(75);
      expect(result[0].formattedDateFull).toBe("Feb 10");
      expect(result[1].CSAT).toBe(50);
      expect(result[1].formattedDateFull).toBe("Feb 11");
    });
  });
});
