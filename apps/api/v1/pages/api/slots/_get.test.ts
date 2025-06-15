import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import dayjs from "@calcom/dayjs";

import handler from "./_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

function buildMockData() {
  prismock.user.create({
    data: {
      id: 1,
      username: "test",
      name: "Test User",
      email: "test@example.com",
    },
  });
  prismock.eventType.create({
    data: {
      id: 1,
      slug: "test",
      length: 30,
      title: "Test Event Type",
      userId: 1,
    },
  });
}

describe("GET /api/slots", () => {
  describe("Errors", () => {
    test("Missing required data", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
      });

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe("Success", () => {
    describe("Regular event-type", () => {
      test("Returns and event type available slots", async () => {
        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "GET",
          query: {
            eventTypeId: 1,
            startTime: dayjs().format(),
            endTime: dayjs().add(1, "day").format(),
            usernameList: "test",
          },
          prisma: prismock,
        });
        buildMockData();
        await handler(req, res);
        console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });
        const response = JSON.parse(res._getData());
        expect(response.slots).toEqual(expect.objectContaining({}));
      });
      test("Returns and event type available slots with passed timeZone", async () => {
        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "GET",
          query: {
            eventTypeId: 1,
            startTime: dayjs().format(),
            endTime: dayjs().add(1, "day").format(),
            usernameList: "test",
            timeZone: "UTC",
          },
          prisma: prismock,
        });
        buildMockData();
        await handler(req, res);
        console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });
        const response = JSON.parse(res._getData());
        expect(response.slots).toEqual(expect.objectContaining({}));
      });
    });
  });
});
