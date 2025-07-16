import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach, beforeEach } from "vitest";

import { buildBooking, buildEventType, buildUser } from "@calcom/lib/test/builder";

import handler from "../../../../pages/api/bookings/[id]/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const userId = 1;
const bookingId = 123;

beforeEach(() => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    email: "test@example.com",
    name: "Test User",
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/bookings/[id]", () => {
  describe("Success", () => {
    test("should return booking when user has access", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          id: bookingId.toString(),
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).booking.id).toBe(bookingId);
    });

    test("should return booking with expanded data when expand parameter is provided", async () => {
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      const mockBookingWithEventType = {
        ...mockBooking,
        eventType: buildEventType(),
        user: buildUser(),
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBookingWithEventType);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          id: bookingId.toString(),
          expand: "team",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.booking.id).toBe(bookingId);
      expect(responseData.booking.eventType).toBeDefined();
      expect(responseData.booking.user).toBeDefined();
    });

    test("should allow system-wide admin to access any booking", async () => {
      const adminUserId = 999;
      const mockBooking = buildBooking({
        id: bookingId,
        userId: userId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          id: bookingId.toString(),
        },
      });

      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).booking.id).toBe(bookingId);
    });
  });

  describe("Errors", () => {
    test("should return 404 when booking not found", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          id: "999",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    test("should return 400 for invalid booking ID", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          id: "invalid",
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("should return 403 when user doesn't have access to booking", async () => {
      const otherUserId = 999;
      const mockBooking = buildBooking({
        id: bookingId,
        userId: otherUserId,
        eventTypeId: buildEventType().id,
      });

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          id: bookingId.toString(),
        },
      });

      req.userId = userId;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
