import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach, beforeEach } from "vitest";

import { buildBooking, buildEventType } from "@calcom/lib/test/builder";

import handler from "../../../../pages/api/bookings/[id]/_patch";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const userId = 1;
const bookingId = 123;

beforeEach(() => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    email: "test@example.com",
    name: "Test User",
  } as any);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("PATCH /api/bookings/[id]", () => {
  describe("Success", () => {
    test("should update booking successfully", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        title: "Original Title",
        eventTypeId: buildEventType().id,
      });

      const updatedBooking = {
        ...mockBooking,
        title: "Updated Title",
      };

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.booking.update.mockResolvedValue(updatedBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: bookingId.toString(),
        },
        body: {
          title: "Updated Title",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.booking.title).toBe("Updated Title");
    });

    test("should allow system-wide admin to update any booking", async () => {
      const adminUserId = 999;
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        title: "Original Title",
        eventTypeId: buildEventType().id,
      });

      const updatedBooking = {
        ...mockBooking,
        title: "Admin Updated Title",
      };

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.booking.update.mockResolvedValue(updatedBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: bookingId.toString(),
        },
        body: {
          title: "Admin Updated Title",
        },
      });

      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    test("should update booking times successfully", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        eventTypeId: buildEventType().id,
      });

      const newStartTime = new Date("2024-01-01T14:00:00Z");
      const newEndTime = new Date("2024-01-01T15:00:00Z");

      const updatedBooking = {
        ...mockBooking,
        startTime: newStartTime,
        endTime: newEndTime,
      };

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.booking.update.mockResolvedValue(updatedBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: bookingId.toString(),
        },
        body: {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(new Date(responseData.booking.startTime)).toEqual(newStartTime);
      expect(new Date(responseData.booking.endTime)).toEqual(newEndTime);
    });
  });

  describe("Errors", () => {
    test("should return 404 when booking not found", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: "999",
        },
        body: {
          title: "Updated Title",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("should return 400 for invalid booking ID", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: "invalid",
        },
        body: {
          title: "Updated Title",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("should return 403 when user doesn't have permission to update booking", async () => {
      const otherUserId = 999;
      const mockBooking = buildBooking({
        id: bookingId,
        userId: otherUserId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: bookingId.toString(),
        },
        body: {
          title: "Unauthorized Update",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("should return 401 when non-admin tries to change userId", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: bookingId.toString(),
        },
        body: {
          userId: 999,
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(403);
    });

    test("should return 400 for invalid date format", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "PATCH",
        query: {
          id: bookingId.toString(),
        },
        body: {
          startTime: "invalid-date",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });
});
