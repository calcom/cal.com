import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import { buildEventType } from "@calcom/lib/test/builder";
import { MembershipRole } from "@calcom/prisma/enums";

import handler from "../../../../pages/api/event-types/[id]/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/event-types/[id]", () => {
  describe("Errors", () => {
    test("Returns 403 if user not admin/team member/event owner", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: 123456,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: 123456,
          userId: 444444,
        })
      );

      req.userId = 333333;

      await expect(handler(req)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
    test("Returns 404 if event type not found", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: 123456,
        },
      });

      req.isSystemWideAdmin = true;

      prismaMock.eventType.findUnique.mockResolvedValue(null);

      req.userId = 333333;

      await expect(handler(req)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });
  });

  describe("Success", async () => {
    test("Returns event type if user is admin", async () => {
      const eventTypeId = 123456;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
        })
      );

      req.isSystemWideAdmin = true;
      req.userId = 333333;

      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(eventTypeId);
    });

    test("Returns event type if user is in team associated with event type", async () => {
      const eventTypeId = 123456;
      const teamId = 9999;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
          teamId,
        })
      );

      prismaMock.team.findFirst.mockResolvedValue({
        id: teamId,
        // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
        members: [
          {
            userId,
          },
        ],
      });

      req.isSystemWideAdmin = false;
      req.userId = userId;

      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(eventTypeId);
      expect(prismaMock.team.findFirst).toHaveBeenCalledWith({
        where: {
          id: teamId,
          members: {
            some: {
              userId: req.userId,
              role: {
                in: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
              },
            },
          },
        },
      });
    });

    test("Returns event type if user is the event type owner", async () => {
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
          userId,
          scheduleId: 1111,
        })
      );

      req.isSystemWideAdmin = false;
      req.userId = userId;

      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(eventTypeId);
      expect(prismaMock.team.findFirst).not.toHaveBeenCalled();
    });
  });
});
