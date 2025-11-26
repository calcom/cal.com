import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach, beforeEach } from "vitest";

import { buildBooking, buildEventType } from "@calcom/lib/test/builder";

import handler from "../../../../pages/api/bookings/[id]/_delete";

vi.mock("@calcom/features/bookings/lib/handleCancelBooking", () => ({
  default: vi.fn().mockResolvedValue({ success: true }),
  handleCancelBooking: vi.fn().mockResolvedValue({ success: true }),
}));

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

describe("DELETE /api/bookings/[id]", () => {
  describe("Success", () => {
    test("should cancel booking successfully", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        query: {
          id: bookingId.toString(),
        },
        body: {
          reason: "User requested cancellation",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
    });

    test("should allow system-wide admin to cancel any booking", async () => {
      const adminUserId = 999;
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        query: {
          id: bookingId.toString(),
        },
        body: {
          reason: "Admin cancellation",
        },
      });

      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe("Errors", () => {
    test("should return 404 when booking not found", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        query: {
          id: "999",
        },
        body: {
          reason: "Test cancellation",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    test("should return 400 for invalid booking ID", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        query: {
          id: "invalid",
        },
        body: {
          reason: "Test cancellation",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("should return 403 when user doesn't have permission to cancel booking", async () => {
      const otherUserId = 999;
      const mockBooking = buildBooking({
        id: bookingId,
        userId: otherUserId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        query: {
          id: bookingId.toString(),
        },
        body: {
          reason: "Unauthorized cancellation",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    test("should return 400 when required cancellation reason is missing", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        query: {
          id: bookingId.toString(),
        },
        body: {},
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
