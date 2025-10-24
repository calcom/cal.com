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
  const eventTypeId = 1234567;
  const teamId = 9999;
  const adminUser = 1111;
  const memberUser = 2222;
  beforeEach(() => {
    vi.resetAllMocks();
    // Mocking membership.findFirst
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    prismaMock.membership.findFirst.mockImplementation(({ where }) => {
      const { userId, teamId, accepted, role } = where;
      const mockData = [
        { userId: 1111, teamId: teamId, accepted: true, role: MembershipRole.ADMIN },
        { userId: 2222, teamId: teamId, accepted: true, role: MembershipRole.MEMBER },
      ];
      // Return the correct user based on the query conditions
      return mockData.find(
        (membership) =>
          membership.userId === userId &&
          membership.teamId === teamId &&
          membership.accepted === accepted &&
          role.in.includes(membership.role)
      );
    });

    // Mocking eventType.findFirst
    prismaMock.eventType.findFirst.mockResolvedValue(
      buildEventType({
        id: eventTypeId,
        teamId,
      })
    );

    // Mocking team.findUnique
    prismaMock.team.findUnique.mockResolvedValue({
      id: teamId,
      // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
      members: [
        { userId: memberUser, role: MembershipRole.MEMBER, teamId: teamId },
        { userId: adminUser, role: MembershipRole.ADMIN, teamId: teamId },
      ],
    });
  });

  describe("Error", async () => {
    test("Fails to remove event type if user is not OWNER/ADMIN of team associated with event type", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      // Assign userId to the request objects
      req.userId = memberUser;

      await expect(handler(req)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
  });

  describe("Success", async () => {
    test("Removes event type if user is owner of team associated with event type", async () => {
      // Mocks for DELETE request
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      // Assign userId to the request objects
      req.userId = adminUser;

      const deletedEventType = await handler(req);
      expect(deletedEventType).not.toBeNull();
    });
  });
});
