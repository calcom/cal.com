import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { ZodError } from "zod";

import { prisma } from "@calcom/prisma";

import { handler } from "../../../pages/api/bookings/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const DefaultPagination = {
  take: 10,
  skip: 0,
};

describe("GET /api/bookings", () => {
  let proUser: Awaited<ReturnType<typeof prisma.user.findFirstOrThrow>>;
  let proUserBooking: Awaited<ReturnType<typeof prisma.booking.findFirstOrThrow>>;
  let memberUser: Awaited<ReturnType<typeof prisma.user.findFirstOrThrow>>;
  let memberUserBooking: Awaited<ReturnType<typeof prisma.booking.create>>;

  beforeAll(async () => {
    proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    proUserBooking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });
    
    // Find an event type for memberUser or use a simple booking
    const memberEventType = await prisma.eventType.findFirst({
      where: {
        OR: [
          { userId: memberUser.id },
          { team: { members: { some: { userId: memberUser.id } } } }
        ]
      }
    });

    memberUserBooking = await prisma.booking.create({
      data: {
        uid: `test-member-booking-${Date.now()}`,
        title: "Member Test Booking",
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000),   // Tomorrow + 1 hour
        userId: memberUser.id,
        eventTypeId: memberEventType?.id,
        status: "ACCEPTED",
      },
    });
  });

  afterAll(async () => {
    // Clean up the test booking created in beforeAll
    if (memberUserBooking?.id) {
      await prisma.booking.delete({
        where: { id: memberUserBooking.id },
      });
    }
  });

  it("Does not return bookings of other users when user has no permission", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        userId: proUser.id, // Try to access proUser's bookings
      },
      pagination: DefaultPagination,
    });

    req.userId = memberUser.id; // But request is from memberUser

    const responseData = await handler(req);
    const groupedUsers = new Set(responseData.bookings.map((b) => b.userId));

    // Should only return memberUser's own bookings, not proUser's
    expect(responseData.bookings.find((b) => b.userId === memberUser.id)).toBeDefined();
    expect(responseData.bookings.find((b) => b.id === memberUserBooking.id)).toBeDefined();
    expect(groupedUsers.size).toBe(1);
    const firstEntry = groupedUsers.entries().next().value;
    expect(firstEntry?.[0]).toBe(memberUser.id);
  });

  it("Returns bookings for regular user", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: DefaultPagination,
    });

    req.userId = proUser.id;

    const responseData = await handler(req);
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    expect(responseData.bookings.find((b) => b.userId !== proUser.id)).toBeUndefined();
  });

  it("Returns bookings for specified user when accessed by system-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: DefaultPagination,
      query: {
        userId: proUser.id,
      },
    });

    req.isSystemWideAdmin = true;
    req.userId = adminUser.id;

    const responseData = await handler(req);
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    expect(responseData.bookings.find((b) => b.userId !== proUser.id)).toBeUndefined();
  });

  it("Returns bookings for all users when accessed by system-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: {
        take: 100,
        skip: 0,
      },
    });

    req.isSystemWideAdmin = true;
    req.userId = adminUser.id;

    const responseData = await handler(req);
    const groupedUsers = new Set(responseData.bookings.map((b) => b.userId));
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    expect(groupedUsers.size).toBeGreaterThan(2);
  });

  it("Returns bookings for org users when accessed by org admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: DefaultPagination,
    });

    req.userId = adminUser.id;
    req.isOrganizationOwnerOrAdmin = true;

    const responseData = await handler(req);
    const groupedUsers = new Set(responseData.bookings.map((b) => b.userId));
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeUndefined();
    expect(groupedUsers.size).toBeGreaterThanOrEqual(2);
  });

  describe("Upcoming bookings feature", () => {
    it("Returns only upcoming bookings when status=upcoming for regular user", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "upcoming",
        },
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.startTime).getTime()).toBeGreaterThanOrEqual(new Date().getTime());
      });
    });

    it("Returns all bookings when status not specified for regular user", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();

      const { req: req2 } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: DefaultPagination,
      });

      req2.userId = proUser.id;

      const responseData2 = await handler(req2);
      expect(responseData2.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    });

    it("Returns only upcoming bookings when status=upcoming for system-wide admin", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "upcoming",
        },
        pagination: {
          take: 100,
          skip: 0,
        },
      });

      req.isSystemWideAdmin = true;
      req.userId = adminUser.id;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.startTime).getTime()).toBeGreaterThanOrEqual(new Date().getTime());
      });
    });

    it("Returns only upcoming bookings when status=upcoming for org admin", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "upcoming",
        },
        pagination: DefaultPagination,
      });

      req.userId = adminUser.id;
      req.isOrganizationOwnerOrAdmin = true;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.startTime).getTime()).toBeGreaterThanOrEqual(new Date().getTime());
      });
    });
  });

  describe("Expand feature to add relational data in return payload", () => {
    it("Returns only team data when expand=team is set", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

      // Find a team booking and a non-team booking from seed data
      const team1 = await prisma.team.findFirst({ where: { slug: "team1" } });
      const teamEventType = await prisma.eventType.findFirst({
        where: { teamId: team1?.id },
        include: { bookings: true },
      });
      const teamBooking = teamEventType?.bookings[0];

      const nonTeamBooking = await prisma.booking.findFirst({
        where: {
          eventType: { teamId: null },
          userId: proUser.id,
        },
      });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          expand: "team",
        },
        pagination: DefaultPagination,
      });

      req.userId = adminUser.id;
      req.isOrganizationOwnerOrAdmin = true;

      const responseData = await handler(req);

      // Verify team booking has team data
      if (teamBooking) {
        const returnedTeamBooking = responseData.bookings.find((b) => b.id === teamBooking.id);
        expect(returnedTeamBooking?.eventType?.team?.slug).toBe("team1");
      }

      // Verify non-team booking has null/undefined team
      if (nonTeamBooking) {
        const returnedNonTeamBooking = responseData.bookings.find((b) => b.id === nonTeamBooking.id);
        if (returnedNonTeamBooking) {
          expect(
            returnedNonTeamBooking.eventType?.team === null ||
              returnedNonTeamBooking.eventType?.team === undefined
          ).toBe(true);
        }
      }
    });
  });

  describe("Date filtering", () => {
    it("filters bookings by dateFrom", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          dateFrom: "2023-01-01T00:00:00Z",
        },
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.startTime).getTime()).toBeGreaterThanOrEqual(
          new Date("2023-01-01T00:00:00Z").getTime()
        );
      });
    });

    it("filters bookings by dateTo", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          dateTo: "2024-12-31T23:59:59Z",
        },
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.endTime).getTime()).toBeLessThanOrEqual(
          new Date("2024-12-31T23:59:59Z").getTime()
        );
      });
    });
  });

  describe("Sorting and ordering", () => {
    it("sorts bookings by createdAt in descending order", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          sortBy: "createdAt",
          order: "desc",
        },
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      const timestamps = responseData.bookings.map((b) => new Date(b.createdAt).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });
  });

  describe("Multiple attendee email filtering", () => {
    it("filters bookings by multiple attendee emails", async () => {
      const attendeeEmails = ["test1@example.com", "test2@example.com"];
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          attendeeEmail: attendeeEmails,
        },
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        const bookingAttendeeEmails = booking.attendees?.map((a) => a.email);
        expect(bookingAttendeeEmails?.some((email) => attendeeEmails.includes(email))).toBe(true);
      });
    });
  });

  describe("Error cases", () => {
    it("throws error for invalid status parameter", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "invalid_status",
        },
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      await expect(handler(req)).rejects.toThrow(ZodError);
    });
  });

  describe("Result merging", () => {
    it("does not return duplicate bookings when merging results from multiple queries", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

      const testUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });

      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          userId: testUser.id, // This will make userEmailsToFilterBy contain the test user's email
        },
        pagination: {
          take: 100,
          skip: 0,
        },
      });

      req.isSystemWideAdmin = true;
      req.userId = adminUser.id;

      const responseData = await handler(req);

      const bookingIds = responseData.bookings.map((booking) => booking.id);

      const uniqueBookingIds = new Set(bookingIds);

      expect(uniqueBookingIds.size).toBe(bookingIds.length);

      if (uniqueBookingIds.size !== bookingIds.length) {
        const counts = bookingIds.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        const duplicates = Object.entries(counts)
          .filter(([_, count]) => count > 1)
          .map(([id]) => id);

        console.log(`Found duplicate booking IDs: ${duplicates.join(", ")}`);
      }
    });
  });
});
