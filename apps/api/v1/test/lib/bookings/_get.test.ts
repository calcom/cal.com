import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach, beforeEach } from "vitest";
import { ZodError } from "zod";

import { buildBooking } from "@calcom/lib/test/builder";

import {
  getAccessibleUsers,
  retrieveOrgScopedAccessibleUsers,
} from "~/lib/utils/retrieveScopedAccessibleUsers";

import { handler } from "../../../pages/api/bookings/_get";

vi.mock("~/lib/utils/retrieveScopedAccessibleUsers", () => ({
  getAccessibleUsers: vi.fn(),
  retrieveOrgScopedAccessibleUsers: vi.fn(),
}));

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const userId = 1;

beforeEach(() => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    email: "test@example.com",
    name: "Test User",
  } as any);
  (getAccessibleUsers as any).mockResolvedValue([userId]);
  (retrieveOrgScopedAccessibleUsers as any).mockResolvedValue([userId]);

  prismaMock.membership.findMany.mockResolvedValue([
    {
      // @ts-expect-error Will be fixed by Prisma 6.7.0 upgrade mock changes - which uses vitest-mock-extended
      team: {
        id: 1,
        isOrganization: true,
      },
    },
  ]);

  prismaMock.user.findMany.mockResolvedValue([
    {
      id: userId,
      email: "test@example.com",
    },
  ] as any);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/bookings", () => {
  describe("Query parameter validation", () => {
    test("should validate status parameter correctly", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "invalid_status",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      await expect(handler(req)).rejects.toThrow(ZodError);
    });

    test("should accept valid status parameter", async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "upcoming",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      const result = await handler(req);
      expect(result.bookings).toEqual([]);
    });

    test("should validate dateFrom parameter format", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          dateFrom: "invalid-date",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      await expect(handler(req)).rejects.toThrow();
    });

    test("should validate dateTo parameter format", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          dateTo: "invalid-date",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      await expect(handler(req)).rejects.toThrow();
    });

    test("should validate sortBy parameter", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          sortBy: "invalid_field",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      await expect(handler(req)).rejects.toThrow();
    });

    test("should validate order parameter", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          order: "invalid_order",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      await expect(handler(req)).rejects.toThrow();
    });
  });

  describe("Permission logic", () => {
    test("should only return user's own bookings for regular user", async () => {
      const mockBookings = [buildBooking({ id: 1, userId: userId }), buildBooking({ id: 2, userId: userId })];

      prismaMock.booking.findMany.mockResolvedValue(mockBookings);
      prismaMock.booking.count.mockResolvedValue(2);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      const result = await handler(req);
      expect(result.bookings).toHaveLength(2);
      expect(result.bookings.every((b) => b.userId === userId)).toBe(true);
    });

    test("should allow system-wide admin to access all bookings", async () => {
      const adminUserId = 999;
      const mockBookings = [
        buildBooking({ id: 1, userId: 1 }),
        buildBooking({ id: 2, userId: 2 }),
        buildBooking({ id: 3, userId: 3 }),
      ];

      prismaMock.booking.findMany.mockResolvedValue(mockBookings);
      prismaMock.booking.count.mockResolvedValue(3);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      const result = await handler(req);
      expect(result.bookings).toHaveLength(3);
    });

    test("should allow org admin to access org bookings", async () => {
      const orgAdminUserId = 999;
      const mockBookings = [buildBooking({ id: 1, userId: 1 }), buildBooking({ id: 2, userId: 2 })];

      prismaMock.booking.findMany.mockResolvedValue(mockBookings);
      prismaMock.booking.count.mockResolvedValue(2);

      (retrieveOrgScopedAccessibleUsers as any).mockResolvedValue([1, 2]);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = orgAdminUserId;
      req.isOrganizationOwnerOrAdmin = true;

      const result = await handler(req);
      expect(result.bookings).toHaveLength(2);
    });
  });

  describe("Filtering edge cases", () => {
    test("should handle empty attendeeEmail array", async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          attendeeEmail: [],
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      const result = await handler(req);
      expect(result.bookings).toEqual([]);
    });

    test("should handle single attendeeEmail string", async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          attendeeEmail: "test@example.com",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      const result = await handler(req);
      expect(result.bookings).toEqual([]);
    });

    test("should handle pagination edge cases", async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: {
          take: 0,
          skip: 0,
        },
      });

      req.userId = userId;

      const result = await handler(req);
      expect(result.bookings).toEqual([]);
    });

    test("should handle large skip values", async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(5);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: {
          take: 10,
          skip: 1000,
        },
      });

      req.userId = userId;

      const result = await handler(req);
      expect(result.bookings).toEqual([]);
    });
  });

  describe("Expand parameter functionality", () => {
    test("should handle invalid expand parameter", async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          expand: "invalid_field",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      await expect(handler(req)).rejects.toThrow();
    });

    test("should handle valid expand parameter", async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          expand: "team",
        },
        pagination: {
          take: 10,
          skip: 0,
        },
      });

      req.userId = userId;

      const result = await handler(req);
      expect(result.bookings).toEqual([]);
    });
  });
});
