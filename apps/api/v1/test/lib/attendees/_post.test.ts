import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import handler from "../../../pages/api/attendees/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("POST /api/attendees", () => {
  describe("Errors", () => {
    test("Returns 403 if user is not admin and has no booking", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          bookingId: 1,
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
        },
      });

      prismaMock.booking.findFirst.mockResolvedValue(null);

      req.userId = 123;
      // req.isAdmin = false;
      await handler(req, res);

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res._getData()).message).toBe("Forbidden");
    });

    test("Returns 200 if user is admin", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          bookingId: 1,
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
        },
      });

      const attendeeData = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        timeZone: "UTC",
        bookingId: 1,
      };

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      prismaMock.attendee.create.mockResolvedValue(attendeeData);
      req.isSystemWideAdmin = true;
      req.userId = 123;
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).attendee).toEqual(attendeeData);
      expect(JSON.parse(res._getData()).message).toBe("Attendee created successfully");
    });

    test("Returns 200 if user is not admin but has a booking", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          bookingId: 1,
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
        },
      });

      const userBooking = { id: 1 };

      prismaMock.booking.findFirst.mockResolvedValue(userBooking as any);

      const attendeeData = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        timeZone: "UTC",
        bookingId: 1,
      };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      prismaMock.attendee.create.mockResolvedValue(attendeeData);

      req.userId = 123;
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).attendee).toEqual(attendeeData);
      expect(JSON.parse(res._getData()).message).toBe("Attendee created successfully");
    });

    test("Returns 400 if request body is invalid", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          // Missing required fields
        },
      });

      req.userId = 123;
      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });
});
