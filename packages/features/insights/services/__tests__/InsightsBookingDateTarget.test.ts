import type { Prisma } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function createServiceWithQueryCapture() {
  const capturedQueries: Prisma.Sql[] = [];

  const mockPrisma = {
    $queryRaw: vi.fn().mockImplementation((query: Prisma.Sql) => {
      capturedQueries.push(query);
      return Promise.resolve([]);
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
