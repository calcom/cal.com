import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach, beforeEach } from "vitest";

import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";

import { handler } from "../../../pages/api/availability/_get";

type SingleUserAvailability = {
  busy: Array<{ start: Date; end: Date; title?: string; source?: string }>;
  timeZone: string;
  workingHours: Array<{ days: number[]; startTime: number; endTime: number; userId?: number }>;
  dateOverrides: Array<unknown>;
  datesOutOfOffice?: Record<string, { fromUser?: unknown; toUser?: unknown; reason?: string; emoji?: string; notes?: string }>;
};

function isSingleUserAvailability(result: unknown): result is SingleUserAvailability {
  return result !== null && typeof result === "object" && "busy" in result && !Array.isArray(result);
}

vi.mock("@calcom/features/di/containers/GetUserAvailability", () => ({
  getUserAvailabilityService: vi.fn(),
}));

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

type MockAvailabilityData = {
  busy: Array<{ start: Date; end: Date; title: string; source: string }>;
  timeZone: string;
  workingHours: Array<{ days: number[]; startTime: number; endTime: number; userId: number }>;
  dateOverrides: Array<unknown>;
  datesOutOfOffice: Record<string, { fromUser: { id: number; displayName: string }; toUser: { id: number; username: string; displayName: string }; reason: string; emoji: string; notes: string }>;
};

const mockAvailabilityData: MockAvailabilityData = {
  busy: [
    {
      start: new Date("2024-01-15T09:00:00Z"),
      end: new Date("2024-01-15T10:00:00Z"),
      title: "Confidential Meeting",
      source: "google-calendar",
    },
    {
      start: new Date("2024-01-15T14:00:00Z"),
      end: new Date("2024-01-15T15:00:00Z"),
      title: "Secret Project Discussion",
      source: "outlook",
    },
  ],
  timeZone: "America/New_York",
  workingHours: [{ days: [1, 2, 3, 4, 5], startTime: 540, endTime: 1020, userId: 1 }],
  dateOverrides: [],
  datesOutOfOffice: {
    "2024-01-20": {
      fromUser: { id: 1, displayName: "John Doe" },
      toUser: { id: 2, username: "jane", displayName: "Jane Doe" },
      reason: "Vacation",
      emoji: "beach",
      notes: "Private vacation notes",
    },
  },
};

const mockGetUserAvailability: ReturnType<typeof vi.fn> = vi.fn();

beforeEach(() => {
  mockGetUserAvailability.mockResolvedValue(mockAvailabilityData);
  (getUserAvailabilityService as ReturnType<typeof vi.fn>).mockReturnValue({
    getUserAvailability: mockGetUserAvailability,
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/availability", () => {
  describe("Data sanitization for non-owners", () => {
    test("should mask busy time titles when querying another user by userId", async () => {
      const requesterId = 100;
      const targetUserId = 200;

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: targetUserId,
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = requesterId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.busy).toHaveLength(2);
      result.busy.forEach((busyTime) => {
        expect(busyTime).not.toHaveProperty("title");
        expect(busyTime).toHaveProperty("start");
        expect(busyTime).toHaveProperty("end");
      });
    });

    test("should mask busy time titles when querying another user by username", async () => {
      const requesterId = 100;
      const targetUserId = 200;

      // @ts-expect-error - prismaMock typing requires full User object but we only need id for this test
      prismaMock.user.findFirst.mockResolvedValue({
        id: targetUserId,
      });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          username: "targetuser",
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = requesterId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.busy).toHaveLength(2);
      result.busy.forEach((busyTime) => {
        expect(busyTime).not.toHaveProperty("title");
      });
    });

    test("should mask OOO reason, emoji and notes when querying another user", async () => {
      const requesterId = 100;
      const targetUserId = 200;

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: targetUserId,
          dateFrom: "2024-01-15",
          dateTo: "2024-01-25",
        },
      });

      req.userId = requesterId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.datesOutOfOffice?.["2024-01-20"]).not.toHaveProperty("reason");
      expect(result.datesOutOfOffice?.["2024-01-20"]).not.toHaveProperty("emoji");
      expect(result.datesOutOfOffice?.["2024-01-20"]).not.toHaveProperty("notes");
      expect(result.datesOutOfOffice?.["2024-01-20"]?.fromUser).toEqual({
        id: 1,
        displayName: "John Doe",
      });
      expect(result.datesOutOfOffice?.["2024-01-20"]?.toUser).toEqual({
        id: 2,
        username: "jane",
        displayName: "Jane Doe",
      });
    });
  });

  describe("Full data access for owners", () => {
    test("should return full data including titles when querying own availability by userId", async () => {
      const userId = 100;

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: userId,
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = userId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.busy).toHaveLength(2);
      expect(result.busy[0].title).toBe("Confidential Meeting");
      expect(result.busy[1].title).toBe("Secret Project Discussion");
    });

    test("should return full data including titles when querying own availability by username", async () => {
      const userId = 100;

      // @ts-expect-error - prismaMock typing requires full User object but we only need id for this test
      prismaMock.user.findFirst.mockResolvedValue({
        id: userId,
      });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          username: "myusername",
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = userId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.busy[0].title).toBe("Confidential Meeting");
      expect(result.datesOutOfOffice?.["2024-01-20"]?.reason).toBe("Vacation");
      expect(result.datesOutOfOffice?.["2024-01-20"]?.notes).toBe("Private vacation notes");
    });
  });

  describe("Full data access for system admins", () => {
    test("should return full data including titles for system admin querying any user", async () => {
      const adminUserId = 999;
      const targetUserId = 200;

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: targetUserId,
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.busy[0].title).toBe("Confidential Meeting");
      expect(result.busy[1].title).toBe("Secret Project Discussion");
      expect(result.datesOutOfOffice?.["2024-01-20"]?.reason).toBe("Vacation");
      expect(result.datesOutOfOffice?.["2024-01-20"]?.emoji).toBe("beach");
      expect(result.datesOutOfOffice?.["2024-01-20"]?.notes).toBe("Private vacation notes");
    });

    test("should return full data for system admin querying by username", async () => {
      const adminUserId = 999;
      const targetUserId = 200;

      // @ts-expect-error - prismaMock typing requires full User object but we only need id for this test
      prismaMock.user.findFirst.mockResolvedValue({
        id: targetUserId,
      });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          username: "targetuser",
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.busy[0].title).toBe("Confidential Meeting");
      expect(result.datesOutOfOffice?.["2024-01-20"]?.reason).toBe("Vacation");
    });
  });

  describe("Edge cases", () => {
    test("should handle availability without datesOutOfOffice", async () => {
      const requesterId = 100;
      const targetUserId = 200;

      mockGetUserAvailability.mockResolvedValue({
        ...mockAvailabilityData,
        datesOutOfOffice: undefined,
      });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: targetUserId,
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = requesterId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.datesOutOfOffice).toBeUndefined();
      expect(result.busy).toHaveLength(2);
      result.busy.forEach((busyTime) => {
        expect(busyTime).not.toHaveProperty("title");
      });
    });

    test("should handle empty busy array", async () => {
      const requesterId = 100;
      const targetUserId = 200;

      mockGetUserAvailability.mockResolvedValue({
        ...mockAvailabilityData,
        busy: [],
      });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: targetUserId,
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = requesterId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.busy).toEqual([]);
    });

    test("should handle empty datesOutOfOffice object", async () => {
      const requesterId = 100;
      const targetUserId = 200;

      mockGetUserAvailability.mockResolvedValue({
        ...mockAvailabilityData,
        datesOutOfOffice: {},
      });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: targetUserId,
          dateFrom: "2024-01-15",
          dateTo: "2024-01-20",
        },
      });

      req.userId = requesterId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      if (!isSingleUserAvailability(result)) {
        throw new Error("Expected single user availability response");
      }
      expect(result.datesOutOfOffice).toEqual({});
    });
  });
});
