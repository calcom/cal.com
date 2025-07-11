import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi } from "vitest";

import handler from "../../../pages/api/bookings/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => key,
  };
});

describe("POST /api/bookings - eventTypeId validation", () => {
  test("String eventTypeId should return 400", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        eventTypeId: "invalid-string",
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: "Bad request, eventTypeId must be a number",
      })
    );
  });

  test("Number eventTypeId should not trigger validation error", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        eventTypeId: 123,
      },
    });

    await handler(req, res);

    const statusCode = res._getStatusCode();
    const responseData = JSON.parse(res._getData());

    if (statusCode === 400) {
      expect(responseData.message).not.toBe("Bad request, eventTypeId must be a number");
    }
  });
});
