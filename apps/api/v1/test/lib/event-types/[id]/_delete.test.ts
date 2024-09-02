import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, beforeEach, vi } from "vitest";

import { buildEventType } from "@calcom/lib/test/builder";
import { MembershipRole } from "@calcom/prisma/enums";

import handler from "../../../../pages/api/event-types/[id]/_delete";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("DELETE /api/event-types/[id]", () => {
  beforeEach(() => {
    vi.mocked(prismaMock.team.findFirst).mockClear();
    vi.mocked(prismaMock.eventType.findFirst).mockClear();
  });

  describe("Error", async () => {
    test("Fails to remove event type if user is not OWNER/ADMIN of team associated with event type", async () => {
      const eventTypeId = 1234567;
      const teamId = 9999;
      const userId = 444444;

      // Mocks for DELETE request
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findFirst.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
          teamId,
        })
      );
      prismaMock.team.findFirst.mockResolvedValue({
        id: teamId,
        members: [{ userId: userId, role: MembershipRole.MEMBER, teamId: teamId }],
      });
      prismaMock.membership.findFirst.mockResolvedValue({
        teamId,
        userId,
        role: MembershipRole.MEMBER,
      });
      // Assign userId to the request objects
      req.userId = userId;

      await handler(req, res);
      expect(res.statusCode).toBe(403); // Check if the deletion was successful
    });
  });

  describe("Success", async () => {
    test("Removes event type if user is owner of team associated with event type", async () => {
      const eventTypeId = 1234567;
      const teamId = 9999;
      const userId = 333333;

      // Mocks for DELETE request
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findFirst.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
          teamId,
          team: {
            id: teamId,
            members: [{ userId: userId, role: MembershipRole.OWNER, accepted: true, teamId: teamId }],
          },
        })
      );
      prismaMock.team.findFirst.mockResolvedValue({
        id: teamId,
        members: [{ userId: userId, role: MembershipRole.MEMBER, teamId: teamId }],
      });
      prismaMock.membership.findFirst.mockResolvedValue({
        teamId,
        userId,
        role: MembershipRole.OWNER,
        accepted: true,
      });

      // Assign userId to the request objects
      req.userId = userId;

      await handler(req, res);
      expect(res.statusCode).toBe(200); // Check if the deletion was successful
    });
  });
});
