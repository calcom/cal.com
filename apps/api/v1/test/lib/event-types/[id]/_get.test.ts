import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, test } from "vitest";

import { buildEventType } from "@calcom/lib/test/builder";

import handler from "../../../../pages/api/event-types/[id]/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/event-types/[id]", () => {
  describe("Errors", () => {
    test("Returns 403 if user not admin/team member/event owner", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {},
        query: {
          id: 123456,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: 123456,
        })
      );

      req.userId = uuidv4();
      await handler(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  describe("Success", async () => {
    test("Returns event type if user is admin", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {},
        query: {
          id: 123456,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: 123456,
        })
      );

      req.isAdmin = true;
      req.userId = uuidv4();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.event_type.id).toEqual(123456);
    });
  });
});
