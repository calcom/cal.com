import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { NextApiRequest } from "next";
import { describe, expect, test, vi, afterEach } from "vitest";

import { HttpError } from "@calcom/lib/http-error";

import { handler } from "../../../pages/api/attendees/_get";

const userId = 1;
const adminUserId = 999;

afterEach(() => {
  vi.resetAllMocks();
});

function createMockRequest(overrides: Partial<NextApiRequest> & { pagination: { take: number; skip: number } }) {
  return {
    method: "GET",
    query: {},
    body: {},
    ...overrides,
  } as NextApiRequest;
}

describe("GET /api/attendees", () => {
  describe("System-wide admin", () => {
    test("should return all attendees for system-wide admin", async () => {
      const mockAttendees = [
        { id: 1, bookingId: 1, name: "John Doe", email: "john@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null },
        { id: 2, bookingId: 2, name: "Jane Smith", email: "jane@example.com", timeZone: "America/New_York", locale: null, phoneNumber: null, noShow: null },
      ];

      prismaMock.attendee.findMany.mockResolvedValue(mockAttendees);

      const req = createMockRequest({
        pagination: { take: 10, skip: 0 },
      });
      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      const result = await handler(req);

      expect(result.attendees).toHaveLength(2);
      expect(prismaMock.attendee.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          id: true,
          bookingId: true,
          name: true,
          email: true,
          timeZone: true,
        },
        take: 10,
        skip: 0,
        orderBy: { id: "asc" },
      });
    });

    test("should throw 404 when no attendees found for admin", async () => {
      prismaMock.attendee.findMany.mockResolvedValue([]);

      const req = createMockRequest({
        pagination: { take: 10, skip: 0 },
      });
      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      await expect(handler(req)).rejects.toThrow(HttpError);
      await expect(handler(req)).rejects.toMatchObject({
        statusCode: 404,
        message: "No attendees were found",
      });
    });
  });

  describe("Regular user", () => {
    test("should only return attendees from user's own bookings", async () => {
      const mockAttendees = [
        { id: 1, bookingId: 1, name: "Attendee 1", email: "att1@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null },
        { id: 2, bookingId: 2, name: "Attendee 2", email: "att2@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null },
      ];

      prismaMock.attendee.findMany.mockResolvedValue(mockAttendees);

      const req = createMockRequest({
        pagination: { take: 10, skip: 0 },
      });
      req.userId = userId;
      req.isSystemWideAdmin = false;

      const result = await handler(req);

      expect(result.attendees).toHaveLength(2);

      expect(prismaMock.attendee.findMany).toHaveBeenCalledWith({
        where: { booking: { userId } },
        select: {
          id: true,
          bookingId: true,
          name: true,
          email: true,
          timeZone: true,
        },
        take: 10,
        skip: 0,
        orderBy: { id: "asc" },
      });
    });

    test("should throw 404 when user has no attendees", async () => {
      prismaMock.attendee.findMany.mockResolvedValue([]);

      const req = createMockRequest({
        pagination: { take: 10, skip: 0 },
      });
      req.userId = userId;
      req.isSystemWideAdmin = false;

      await expect(handler(req)).rejects.toThrow(HttpError);
      await expect(handler(req)).rejects.toMatchObject({
        statusCode: 404,
        message: "No attendees were found",
      });
    });
  });

  describe("Pagination", () => {
    test("should respect MAX_TAKE limit of 250", async () => {
      const mockAttendees = [{ id: 1, bookingId: 1, name: "Test", email: "test@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null }];

      prismaMock.attendee.findMany.mockResolvedValue(mockAttendees);

      const req = createMockRequest({
        pagination: { take: 500, skip: 0 },
      });
      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      await handler(req);

      expect(prismaMock.attendee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 250,
        })
      );
    });

    test("should apply skip correctly for pagination", async () => {
      const mockAttendees = [{ id: 11, bookingId: 5, name: "Test", email: "test@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null }];

      prismaMock.attendee.findMany.mockResolvedValue(mockAttendees);

      const req = createMockRequest({
        pagination: { take: 10, skip: 20 },
      });
      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      await handler(req);

      expect(prismaMock.attendee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    test("should apply pagination to attendee query for regular users", async () => {
      const mockAttendees = [{ id: 1, bookingId: 1, name: "Test", email: "test@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null }];

      prismaMock.attendee.findMany.mockResolvedValue(mockAttendees);

      const req = createMockRequest({
        pagination: { take: 5, skip: 10 },
      });
      req.userId = userId;
      req.isSystemWideAdmin = false;

      await handler(req);

      expect(prismaMock.attendee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { booking: { userId } },
          take: 5,
          skip: 10,
        })
      );
    });
  });

  describe("Response format", () => {
    test("should return attendees with correct fields", async () => {
      // Mock returns only the selected fields (simulating Prisma's select behavior)
      const mockAttendees = [
        {
          id: 1,
          bookingId: 100,
          name: "John Doe",
          email: "john@example.com",
          timeZone: "Europe/London",
        },
      ];

      prismaMock.attendee.findMany.mockResolvedValue(mockAttendees as never);

      const req = createMockRequest({
        pagination: { take: 10, skip: 0 },
      });
      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      const result = await handler(req);

      expect(result.attendees[0]).toEqual({
        id: 1,
        bookingId: 100,
        name: "John Doe",
        email: "john@example.com",
        timeZone: "Europe/London",
      });
    });

    test("should order attendees by id ascending", async () => {
      const mockAttendees = [
        { id: 3, bookingId: 1, name: "C", email: "c@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null },
        { id: 2, bookingId: 1, name: "B", email: "b@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null },
        { id: 1, bookingId: 1, name: "A", email: "a@example.com", timeZone: "UTC", locale: null, phoneNumber: null, noShow: null },
      ];

      prismaMock.attendee.findMany.mockResolvedValue(mockAttendees);

      const req = createMockRequest({
        pagination: { take: 10, skip: 0 },
      });
      req.userId = adminUserId;
      req.isSystemWideAdmin = true;

      await handler(req);

      expect(prismaMock.attendee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { id: "asc" },
        })
      );
    });
  });
});
