import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import { HttpError } from "@calcom/lib/http-error";

import handler from "../../../pages/api/selected-calendars/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("POST /api/selected-calendars", () => {
  describe("Errors", () => {
    test("Returns 403 if non-admin user tries to set userId in body", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          integration: "google",
          externalId: "ext123",
          userId: 444444,
        },
      });

      req.userId = 333333;

      try {
        await handler(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpError);
        expect((e as HttpError).statusCode).toBe(403);
        expect((e as HttpError).message).toBe("ADMIN required for userId");
      }
    });

    test("Returns 400 if request body is invalid", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          integration: "google",
        },
      });

      req.userId = 333333;
      req.isSystemWideAdmin = true;

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe("invalid_type in 'externalId': Required");
    });
  });

  describe("Success", () => {
    test("Creates selected calendar if user is admin and sets bodyUserId", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        query: {
          apiKey: "validApiKey",
        },
        body: {
          integration: "google",
          externalId: "ext123",
          userId: 444444,
        },
      });

      req.userId = 333333;
      req.isSystemWideAdmin = true;

      prismaMock.user.findFirstOrThrow.mockResolvedValue({
        id: 444444,
      } as any);

      prismaMock.selectedCalendar.create.mockResolvedValue({
        credentialId: 1,
        integration: "google",
        externalId: "ext123",
        userId: 444444,
      });

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.selected_calendar.credentialId).toBe(1);
      expect(responseData.message).toBe("Selected Calendar created successfully");
    });

    test("Creates selected calendar if user is non-admin and does not set bodyUserId", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        query: {
          apiKey: "validApiKey",
        },
        body: {
          integration: "google",
          externalId: "ext123",
        },
      });

      req.userId = 333333;

      prismaMock.selectedCalendar.create.mockResolvedValue({
        credentialId: 1,
        integration: "google",
        externalId: "ext123",
        userId: 333333,
      });

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.selected_calendar.credentialId).toBe(1);
      expect(responseData.message).toBe("Selected Calendar created successfully");
    });
  });
});
