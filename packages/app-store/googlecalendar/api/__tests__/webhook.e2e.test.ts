import prismock from "../../../../../tests/libs/__mocks__/prisma";
import "../../lib/__mocks__/features.repository";
import "../../lib/__mocks__/getGoogleAppKeys";

import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { createCredentialForCalendarService } from "../../lib/__tests__/utils";
import handler from "../webhook";

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn().mockResolvedValue({
    fetchAvailabilityAndSetCache: vi.fn().mockResolvedValue(undefined),
  }),
}));

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.stubEnv("GOOGLE_WEBHOOK_TOKEN", "test-webhook-token");

describe("Google Calendar Webhook", () => {
  setupAndTeardown();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should invalidate cache when receiving valid Google webhook", async () => {
    const credential = await createCredentialForCalendarService();
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        userId: credential.userId!,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: credential.id,
        googleChannelId: "test-channel-id",
        googleChannelKind: "api#channel",
        googleChannelResourceId: "test-resource-id",
        googleChannelResourceUri: "test-resource-uri",
        googleChannelExpiration: "1234567890",
      },
    });

    await prismock.calendarCache.create({
      data: {
        credentialId: credential.id,
        key: JSON.stringify({ timeMin: "2025-01-01", timeMax: "2025-02-01" }),
        value: JSON.stringify([]),
        expiresAt: new Date(Date.now() + 3600000),
        stale: false,
      },
    });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      headers: {
        "x-goog-channel-token": "test-webhook-token",
        "x-goog-channel-id": "test-channel-id",
      },
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ message: "ok" });

    const updatedCache = await prismock.calendarCache.findFirst({
      where: { credentialId: credential.id },
    });
    expect(updatedCache?.stale).toBe(true);
  });

  it("should return 403 for invalid webhook token", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      headers: {
        "x-goog-channel-token": "invalid-token",
        "x-goog-channel-id": "test-channel-id",
      },
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
  });

  it("should return 403 for missing channel ID", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      headers: {
        "x-goog-channel-token": "test-webhook-token",
      },
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
  });

  it("should handle case when no selected calendar found", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      headers: {
        "x-goog-channel-token": "test-webhook-token",
        "x-goog-channel-id": "non-existent-channel-id",
      },
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ message: "ok" });
  });
});
