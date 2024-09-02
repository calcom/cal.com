import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import { buildEventType } from "@calcom/lib/test/builder";

import handler from "../../../../pages/api/event-types/[id]/_delete";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/event-types/[id]", () => {
  describe("Errors", () => {
    test("Returns 403 if user not admin/team member/event owner", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
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
      await handler(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  describe("Success", async () => {
    test("Removes event type if user is owner of team associated with event type", async () => {
      const eventTypeId = 123456;
      const teamId = 9999;
      const userId = 333333;
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "DELETE",
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

      prismaMock.team.findUnique.mockResolvedValue({ id: teamId });
      prismaMock.membership.findUnique.mockResolvedValue({
        teamId,
        userId,
        role: "OWNER",
        accepted: true,
      });
      req.userId = userId;
      // req.isSystemWideAdmin = true;

      await handler(req, res);
      console.log({ req }, { res });

      expect(res.statusCode).toBe(200);
    });
  });
});
