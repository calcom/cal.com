import { prisma } from "@calcom/prisma";
import type { Prisma, Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterAll, beforeAll, describe, expect, it, test } from "vitest";
import authMiddleware from "../../../pages/api/bookings/[id]/_auth-middleware";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const createEventTypeEventSelect = {
  bookings: true,
} satisfies Prisma.EventTypeSelect;

describe("Booking ownership and access in Middleware", () => {
  let adminUserRef: User;
  let ownerUserRef: User;
  let orgOwnerUserRef: User;
  let memberUserRef: User;
  let orgRef: Team;

  let createEventResult1: Prisma.EventTypeGetPayload<{ select: typeof createEventTypeEventSelect }>;
  let createEventResult2: Prisma.EventTypeGetPayload<{ select: typeof createEventTypeEventSelect }>;

  // mock user data
  beforeAll(async () => {
    //Create Users
    const createAdminUser = prisma.user.create({
      data: {
        username: `admin-${Date.now()}`,
        name: "Admin User",
        email: `admin+${Date.now()}@example.com`,
      },
    });
    const createOwnerUser = prisma.user.create({
      data: {
        username: `owner-${Date.now()}`,
        name: "Owner User",
        email: `owner+${Date.now()}@example.com`,
      },
    });
    const createOrgOwnerUser = prisma.user.create({
      data: {
        username: `org-owner-${Date.now()}`,
        name: "Org Owner",
        email: `org-owner+${Date.now()}@example.com`,
      },
    });
    const createMemberUser = prisma.user.create({
      data: {
        username: `member-${Date.now()}`,
        name: "Member User",
        email: `member+${Date.now()}@example.com`,
      },
    });

    [adminUserRef, ownerUserRef, orgOwnerUserRef, memberUserRef] = await Promise.all([
      createAdminUser,
      createOwnerUser,
      createOrgOwnerUser,
      createMemberUser,
    ]);

    //create Org & Team
    orgRef = await prisma.team.create({
      data: {
        name: "Org",
        slug: `org-${Date.now()}`,
        isOrganization: true,
        children: {
          create: {
            name: "Team 1",
            slug: `team1-${Date.now()}`,
            members: {
              createMany: {
                data: [
                  {
                    userId: adminUserRef.id,
                    role: MembershipRole.ADMIN,
                    accepted: true,
                  },
                  {
                    userId: ownerUserRef.id,
                    role: MembershipRole.OWNER,
                    accepted: true,
                  },
                  {
                    userId: memberUserRef.id,
                    role: MembershipRole.MEMBER,
                    accepted: true,
                  },
                ],
              },
            },
          },
        },
        members: {
          createMany: {
            data: [
              {
                userId: ownerUserRef.id,
                role: MembershipRole.OWNER,
                accepted: true,
              },
              {
                userId: memberUserRef.id,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
              {
                userId: adminUserRef.id,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
            ],
          },
        },
      },
    });

    //create eventTypes
    const createEventTypeEvent1 = prisma.eventType.create({
      data: {
        title: "Event 1",
        slug: `event-1-${Date.now()}`,
        userId: ownerUserRef.id,
        length: 60,
        bookings: {
          create: {
            uid: `booking-2-${Date.now()}`,
            title: "Booking 2",
            userId: memberUserRef.id,
            startTime: "2024-08-30T06:45:00.000Z",
            endTime: "2024-08-30T07:45:00.000Z",
            attendees: {
              create: {
                name: "Member User",
                email: memberUserRef.email,
                timeZone: "UTC",
              },
            },
          },
        },
      },
      select: createEventTypeEventSelect,
    });
    const createEventTypeEvent2 = prisma.eventType.create({
      data: {
        title: "Event 2",
        slug: `event-2-${Date.now()}`,
        length: 60,
        teamId: orgRef.id,
        bookings: {
          create: {
            uid: `booking-1-${Date.now()}`,
            title: "Booking 1",
            userId: adminUserRef.id,
            startTime: "2024-08-30T06:45:00.000Z",
            endTime: "2024-08-30T07:45:00.000Z",
            attendees: {
              create: {
                name: "Admin User",
                email: adminUserRef.email,
                timeZone: "UTC",
              },
            },
          },
        },
      },
      select: createEventTypeEventSelect,
    });

    [createEventResult1, createEventResult2] = await Promise.all([
      createEventTypeEvent1,
      createEventTypeEvent2,
    ]);
  });

  afterAll(async () => {
    console.log("Cleaning up org", orgRef.id);
    await prisma.team.delete({
      where: {
        id: orgRef.id,
      },
    });
    console.log("Cleaning up users", [
      adminUserRef.id,
      ownerUserRef.id,
      orgOwnerUserRef.id,
      memberUserRef.id,
    ]);
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [adminUserRef.id, ownerUserRef.id, orgOwnerUserRef.id, memberUserRef.id],
        },
      },
    });
  });

  test("should not throw error for bookings where user is an attendee", async () => {
    console.log(createEventResult1.bookings[0].id);
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: createEventResult1.bookings[0].id,
      },
      prisma,
    });
    req.userId = memberUserRef.id;
    await expect(authMiddleware(req)).resolves.not.toThrow();
  });

  test("should throw error for bookings where user is not an attendee", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 1,
      },
      prisma,
    });
    req.userId = memberUserRef.id;

    await expect(authMiddleware(req)).rejects.toThrow();
  });

  test("should not throw error for booking where user is the event type owner", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: createEventResult2.bookings[0].id,
      },
      prisma,
    });
    req.userId = ownerUserRef.id;
    await expect(authMiddleware(req)).resolves.not.toThrow();
  });

  test("should not throw error for booking where user is team owner or admin", async () => {
    const { req: req1 } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: createEventResult2.bookings[0].id,
      },
      prisma,
    });
    const { req: req2 } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: createEventResult2.bookings[0].id,
      },
      prisma,
    });
    req1.userId = adminUserRef.id;
    req2.userId = ownerUserRef.id;

    await expect(authMiddleware(req1)).resolves.not.toThrow();
    await expect(authMiddleware(req2)).resolves.not.toThrow();
  });
  test("should throw error for booking where user is not team owner or admin", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: createEventResult2.bookings[0].id,
      },
      prisma,
    });

    req.userId = memberUserRef.id;

    await expect(authMiddleware(req)).rejects.toThrow();
  });
  test("should not throw error when user is system-wide admin", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 2,
      },
      prisma,
    });
    req.userId = adminUserRef.id;
    req.isSystemWideAdmin = true;

    await authMiddleware(req);
  });

  it("should throw error when user is org-wide admin", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        id: 1,
      },
      prisma,
    });
    req.userId = orgOwnerUserRef.id;
    req.isOrganizationOwnerOrAdmin = true;

    await expect(authMiddleware(req)).rejects.toThrow();
  });
});
