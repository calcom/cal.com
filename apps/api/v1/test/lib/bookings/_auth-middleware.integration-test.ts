import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi, test, beforeEach } from "vitest";

import type { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import authMiddleware from "../../../pages/api/bookings/[id]/_auth-middleware";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("Bookings auth middleware", () => {
  it("Returns 403 when user has no permission to the booking", async () => {
    const trialUser = await prisma.user.findFirstOrThrow({ where: { email: "trial@example.com" } });
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: booking.id,
      },
    });

    req.userId = trialUser.id;

    try {
      await authMiddleware(req);
    } catch (error) {
      const httpError = error as HttpError;
      expect(httpError.statusCode).toBe(403);
    }
  });

  it("Doesn't throw error when user is the booking user", async () => {
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: booking.id,
      },
    });

    req.userId = proUser.id;

    await authMiddleware(req);
  });

  it("Doesn't throw error when user is system-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "admin@example.com" } });
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: booking.id,
      },
    });

    req.userId = adminUser.id;
    req.isSystemWideAdmin = true;

    await authMiddleware(req);
  });

  it("Doesn't throw error when user is org-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member1-acme@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: memberUser.id } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: booking.id,
      },
    });

    req.userId = adminUser.id;
    req.isOrganizationOwnerOrAdmin = true;

    await authMiddleware(req);
  });
});

describe("Booking ownership and access in Middleware", () => {
  const adminUserId = 1111;
  const ownerUserId = 1122;
  const memberUserId = 2222;
  const adminUserEmail = "admin@example.com";
  const ownerUserEmail = "owner@example.com";
  const memberUserEmail = "member@example.com";
  const guestUserEmail = "guest@example.com";
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock user.findUnique for the specific scenario
    prismaMock.user.findUnique.mockImplementation(({ where, select }) => {
      const { id: userId } = where;

      // Define mock user data including email and bookings
      const mockUsers = [
        {
          id: 1111,
          email: adminUserEmail,
          bookings: [{ id: 111 }],
        },
        {
          id: 1122,
          email: ownerUserEmail,
          bookings: [{ id: 12314 }],
        },
        {
          id: 2222,
          email: memberUserEmail,
          bookings: [{ id: 111 }],
        },
      ];

      // Find the matching user based on userId
      const user = mockUsers.find((u) => u.id === userId);

      if (!user) return null;

      // Filter bookings if a specific booking id is requested
      const filteredBookings = user.bookings.filter((booking) =>
        select.bookings.where ? booking.id === select.bookings.where.id : true
      );

      // Return the selected fields
      return {
        email: select.email ? user.email : undefined,
        bookings: select.bookings ? filteredBookings : [],
      };
    });

    // Mocking bookings
    const mockAllBookings = () => {
      prismaMock.booking.findMany.mockImplementation(({ where }) => {
        console.log("Mock called with where clause:", where);

        const { id, eventType, attendees } = where;

        // Define your mock data for all scenarios
        const mockData = [
          {
            id: 111,
            attendees: [{ email: adminUserEmail }, { email: memberUserEmail }],
          },
          {
            id: 222,
            attendees: [{ email: guestUserEmail }],
          },
          {
            id: 333,
            eventType: { owner: { id: adminUserId } },
          },
          {
            id: 444,
            eventType: { owner: { id: ownerUserId } },
          },
          {
            id: 555,
            eventType: {
              team: {
                members: [
                  { userId: adminUserId, role: MembershipRole.ADMIN, accepted: true },
                  { userId: memberUserId, role: MembershipRole.MEMBER, accepted: true },
                ],
              },
            },
          },
          {
            id: 666,
            eventType: {
              team: {
                members: [
                  { userId: ownerUserId, role: MembershipRole.OWNER, accepted: true },
                  { userId: memberUserId, role: MembershipRole.MEMBER, accepted: false },
                ],
              },
            },
          },
        ];

        // Filtering logic based on the `where` clause
        return mockData.filter((booking) => {
          // Check if the query is for attendees
          if (attendees) {
            console.log("Handling attendees check...");
            return (
              booking.id === id &&
              booking.attendees?.some((attendee) => attendee.email === attendees.some.email)
            );
          }

          // Check if the query is for eventType owner
          if (eventType?.owner) {
            console.log("Handling eventType owner check...");
            return booking.id === id && booking.eventType?.owner?.id === eventType.owner.id;
          }

          // Check if the query is for team members (admin/owner)
          if (eventType?.team?.members) {
            console.log("Handling team members check...");
            return (
              booking.id === id &&
              booking.eventType?.team?.members.some(
                (member) =>
                  member.userId === eventType.team.members.some.userId &&
                  eventType.team.members.some.role.in.includes(member.role) &&
                  member.accepted === eventType.team.members.some.accepted
              )
            );
          }

          return false;
        });
      });
    };

    // Call this mock before your tests
    mockAllBookings();
  });
  test("should not throw error for bookings where user is an attendee", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: 111,
      },
    });

    req.userId = memberUserId;

    try {
      await authMiddleware(req);
      expect(true).toBe(true);
    } catch (error) {
      throw new Error(`${error.statusCode}: ${error.message}`);
    }
  });

  test("should not throw error for booking where user is the event type owner", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: 444,
      },
    });

    req.userId = ownerUserId;
    try {
      await authMiddleware(req);
      expect(true).toBe(true);
    } catch (error) {
      throw new Error(`${error.statusCode}: ${error.message}`);
    }
  });

  test("should not throw error for booking where user is team owner or admin", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: 555,
      },
    });

    req.userId = ownerUserId;

    try {
      await authMiddleware(req);
      expect(true).toBe(true);
    } catch (error) {
      throw new Error(`${error.statusCode}: ${error.message}`);
    }
  });
});
