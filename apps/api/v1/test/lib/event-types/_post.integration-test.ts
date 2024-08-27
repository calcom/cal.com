import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, afterAll, it, expect } from "vitest";

import prisma from "@calcom/prisma";

import handler from "../../../pages/api/event-types/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response & ReturnType<typeof handler>;

describe("POST /api/event-types", () => {
  const eventTypeIdsToRemove: number[] = [];
  afterAll(async () => {
    await prisma.eventType.deleteMany({
      where: {
        id: {
          in: eventTypeIdsToRemove,
        },
      },
    });
  });
  describe("User Events", () => {
    it("Can create user event", async () => {
      const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });
      const reqBody = {
        title: "Example Event Type for integration tests",
        slug: "example-integration-tests-v1",
        length: 60,
        metadata: {},
      };

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: reqBody,
      });
      req.userId = memberUser.id;

      await handler(req, res);
      expect(res.statusCode).toBe(200);

      const memberUserLatestEventType = await prisma.eventType.findUniqueOrThrow({
        where: {
          userId_slug: {
            userId: memberUser.id,
            slug: reqBody.slug,
          },
        },
      });

      expect(memberUserLatestEventType.slug).toBe(reqBody.slug);
      eventTypeIdsToRemove.push(memberUserLatestEventType.id);
    });
  });

  describe("Team events", async () => {
    const teamAdmin = await prisma.user.findFirstOrThrow({ where: { email: "teampro@example.com" } });
    const teamMember = await prisma.user.findFirstOrThrow({ where: { email: "teampro2@example.com" } });
    const userNotInTeam = await prisma.user.findFirstOrThrow({
      where: { email: "member2-acme@example.com" },
    });

    describe("Managed Event Types", async () => {
      it("Can create Managed Event", async () => {
        const reqBody = {
          title: "Managed Example Event Type for integration tests",
          teamId: 2,
          schedulingType: "MANAGED",
          slug: "managed-example-integration-tests-v1",
          length: 60,
          metadata: {},
        };
        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: reqBody,
        });
        req.userId = teamAdmin.id;

        await handler(req, res);

        expect(res.statusCode).toBe(200);

        const managedParentEvent = await prisma.eventType.findUniqueOrThrow({
          where: {
            teamId_slug: {
              slug: reqBody.slug,
              teamId: 2,
            },
          },
        });

        eventTypeIdsToRemove.push(managedParentEvent.id);
      });
      it("Can assign users to managed event type", async () => {
        const managedParentEvent = await prisma.eventType.create({
          data: {
            title: "Managed Example Event Type for integration tests-2",
            teamId: 2,
            schedulingType: "MANAGED",
            slug: "managed-example-integration-tests-v1-2",
            length: 60,
            metadata: {},
          },
        });
        const childReqBody = {
          title: "Child Event Example",
          parentId: managedParentEvent.id,
          slug: "child-event-example",
          length: 60,
        };

        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            ...childReqBody,
            userId: teamAdmin.id,
          },
        });
        req.userId = teamAdmin.id;

        await handler(req, res);

        expect(res.statusCode).toBe(200);

        const childEvent = await prisma.eventType.findUniqueOrThrow({
          where: {
            userId_slug: {
              userId: teamAdmin.id,
              slug: childReqBody.slug,
            },
          },
          select: {
            id: true,
            parentId: true,
          },
        });

        const updatedParentEvent = await prisma.eventType.findUniqueOrThrow({
          where: {
            id: managedParentEvent.id,
          },
          select: {
            children: {
              select: {
                id: true,
              },
            },
          },
        });

        expect(updatedParentEvent.children[0].id).toBe(childEvent.id);
        expect(childEvent.parentId).toBe(managedParentEvent.id);

        eventTypeIdsToRemove.push(childEvent.id, managedParentEvent.id);
      });
    });

    it("Can create Round Robin / Collective events and connect hosts", async () => {
      const reqBody = {
        title: "RR Example Event Type for integration tests",
        teamId: 2,
        schedulingType: "ROUND_ROBIN",
        slug: "rr-example-integration-tests-v1",
        length: 60,
        metadata: {},
        hosts: [
          { userId: teamAdmin.id, isFixed: false },
          { userId: teamMember.id, isFixed: true },
        ],
      };

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: reqBody,
      });
      req.userId = teamAdmin.id;

      await handler(req, res);
      expect(res.statusCode).toBe(200);

      const teamLatestEvent = await prisma.eventType.findFirstOrThrow({
        where: {
          teamId: 2,
        },
        select: {
          id: true,
          slug: true,
          hosts: true,
        },
        orderBy: {
          id: "desc",
        },
        take: 1,
      });

      expect(teamLatestEvent.slug).toBe(reqBody.slug);
      expect(teamLatestEvent.hosts).toMatchObject(reqBody.hosts);
      eventTypeIdsToRemove.push(teamLatestEvent.id);
    });
    it("Returns 401 if team member is trying to create event types", async () => {
      const reqBody = {
        title: "RR Example Event Type for integration tests",
        teamId: 2,
        schedulingType: "COLLECTIVE",
        slug: "rr-example-integration-tests-v1",
        length: 60,
        metadata: {},
        hosts: [
          { userId: teamAdmin.id, isFixed: false },
          { userId: teamMember.id, isFixed: true },
        ],
      };

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: reqBody,
      });
      req.userId = teamMember.id;

      await handler(req, res);
      expect(res.statusCode).toBe(401);
    });

    it("Returns 400 if host is not a team member", async () => {
      const reqBody = {
        title: "RR Example Event Type for integration tests",
        teamId: 2,
        schedulingType: "ROUND_ROBIN",
        slug: "rr-example-integration-tests-v1",
        length: 60,
        metadata: {},
        hosts: [
          { userId: teamAdmin.id, isFixed: false },
          { userId: userNotInTeam.id, isFixed: true },
        ],
      };

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: reqBody,
      });
      req.userId = teamAdmin.id;

      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });
  });
});
