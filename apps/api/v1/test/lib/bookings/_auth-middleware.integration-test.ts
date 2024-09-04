import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, test } from "vitest";

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
  const adminUserId = 1;
  const ownerUserId = 2;
  const memberUserId = 3;
  const adminUserEmail = "admin@example.com";
  const ownerUserEmail = "owner@example.com";
  const memberUserEmail = "member@example.com";
  // mock user data
  function buildMockData() {
    prismock.user.create({
      data: {
        id: adminUserId,
        username: "admin",
        name: "Admin User",
        email: adminUserEmail,
      },
    });
    prismock.user.create({
      data: {
        id: ownerUserId,
        username: "owner",
        name: "Owner User",
        email: ownerUserEmail,
      },
    });

    prismock.user.create({
      data: {
        id: memberUserId,
        username: "member",
        name: "Member User",
        email: memberUserEmail,
        bookings: {
          create: {
            id: 2,
            uid: "2",
            title: "Booking 2",
            eventTypeId: 1,
            startTime: "2024-08-30T06:45:00.000Z",
            endTime: "2024-08-30T07:45:00.000Z",
            attendees: {
              create: {
                name: "Member User",
                email: memberUserEmail,
                timeZone: "UTC",
              },
            },
          },
        },
      },
    });
    prismock.team.create({
      data: {
        id: 1,
        name: "Team 1",
        slug: "team1",
        members: {
          createMany: {
            data: [
              {
                userId: adminUserId,
                role: MembershipRole.ADMIN,
                accepted: true,
              },
              {
                userId: ownerUserId,
                role: MembershipRole.OWNER,
                accepted: true,
              },
              {
                userId: memberUserId,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
            ],
          },
        },
      },
    });
    prismock.eventType.create({
      data: {
        id: 1,
        title: "Event 1",
        slug: "event",
        length: 60,
        bookings: {
          connect: {
            id: 2,
          },
        },
      },
    });
    prismock.eventType.create({
      data: {
        id: 2,
        title: "Event 2",
        slug: "event",
        length: 60,
        teamId: 1,
        bookings: {
          connect: {
            id: 1,
          },
        },
      },
    });
    prismock.eventType.update({
      where: {
        id: 1,
      },
      data: {
        owner: {
          connect: {
            id: ownerUserId,
          },
        },
      },
    });
    prismock.eventType.update({
      where: {
        id: 2,
      },
      data: {
        team: {
          connect: {
            id: 1,
          },
        },
      },
    });
    // Call Prisma to create booking with attendees
    prismock.booking.create({
      data: {
        id: 1,
        uid: "1",
        title: "Booking 1",
        userId: 1,
        startTime: "2024-08-30T06:45:00.000Z",
        endTime: "2024-08-30T07:45:00.000Z",
        eventTypeId: 2,
        attendees: {
          create: {
            name: "Admin User",
            email: adminUserEmail,
            timeZone: "UTC",
          },
        },
      },
    });
  }

  test("should not throw error for bookings where user is an attendee", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 2,
      },
      prisma: prismock,
    });
    buildMockData();
    req.userId = memberUserId;
    await expect(authMiddleware(req)).resolves.not.toThrow();
  });

  test("should throw error for bookings where user is not an attendee", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 1,
      },
      prisma: prismock,
    });
    buildMockData();
    req.userId = memberUserId;

    await expect(authMiddleware(req)).rejects.toThrow();
  });

  test("should not throw error for booking where user is the event type owner", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 2,
      },
      prisma: prismock,
    });
    buildMockData();
    req.userId = ownerUserId;
    await expect(authMiddleware(req)).resolves.not.toThrow();
  });

  test("should not throw error for booking where user is team owner or admin", async () => {
    const { req: req1 } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 1,
      },
      prisma: prismock,
    });
    const { req: req2 } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 1,
      },
      prisma: prismock,
    });
    buildMockData();

    req1.userId = adminUserId;
    req2.userId = ownerUserId;

    await expect(authMiddleware(req1)).resolves.not.toThrow();
    await expect(authMiddleware(req2)).resolves.not.toThrow();
  });
  test("should throw error for booking where user is not team owner or admin", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 1,
      },
      prisma: prismock,
    });
    buildMockData();

    req.userId = memberUserId;

    await expect(authMiddleware(req)).rejects.toThrow();
  });
});
