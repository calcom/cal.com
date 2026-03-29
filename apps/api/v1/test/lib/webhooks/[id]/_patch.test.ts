import { vi } from "vitest";

// Mock IS_SELF_HOSTED = false to simulate Cal.com SaaS (strictest SSRF rules)
vi.mock("@calcom/lib/constants", () => ({
  IS_SELF_HOSTED: false,
  IS_PRODUCTION: false,
}));

import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import handler from "../../../../pages/api/webhooks/[id]/_patch";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

function buildReq(body: Record<string, unknown>, id = "existing-webhook-id") {
  const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
    method: "PATCH",
    query: { id },
    body,
  });
  req.userId = 1;
  req.isSystemWideAdmin = false;
  return { req, res };
}

const existingWebhook = {
  id: "existing-webhook-id",
  userId: 1,
  eventTypeId: null,
  payloadTemplate: null,
  eventTriggers: ["BOOKING_CREATED"],
  version: "2021-10-20",
  subscriberUrl: "https://example.com/webhook",
  appId: null,
  active: true,
  secret: null,
  createdAt: new Date(),
  teamId: null,
  platform: false,
  platformWidgetUrl: null,
  platformOAuthClientId: null,
} as any;

describe("PATCH /api/v1/webhooks/[id] - SSRF Protection", () => {
  // --- Blocked URL updates ---

  test("Blocks updating subscriberUrl to localhost", async () => {
    const { req, res } = buildReq({ subscriberUrl: "https://localhost/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks updating subscriberUrl to AWS metadata", async () => {
    const { req, res } = buildReq({
      subscriberUrl: "http://169.254.169.254/latest/meta-data/",
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks updating subscriberUrl to private IP 10.x", async () => {
    const { req, res } = buildReq({ subscriberUrl: "https://10.0.0.1/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks updating subscriberUrl to private IP 192.168.x", async () => {
    const { req, res } = buildReq({ subscriberUrl: "https://192.168.1.1/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks updating subscriberUrl to GCP metadata", async () => {
    const { req, res } = buildReq({
      subscriberUrl: "https://metadata.google.internal/computeMetadata/v1/",
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks updating subscriberUrl to HTTP (non-HTTPS)", async () => {
    const { req, res } = buildReq({ subscriberUrl: "http://example.com/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  // --- Allowed updates ---

  test("Allows updating subscriberUrl to valid HTTPS URL", async () => {
    prismaMock.webhook.update.mockResolvedValue({
      ...existingWebhook,
      subscriberUrl: "https://new-endpoint.example.com/webhook",
    });

    const { req, res } = buildReq({
      subscriberUrl: "https://new-endpoint.example.com/webhook",
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(prismaMock.webhook.update).toHaveBeenCalled();
  });

  test("Allows updating non-URL fields without SSRF check", async () => {
    prismaMock.webhook.update.mockResolvedValue({
      ...existingWebhook,
      active: false,
    });

    const { req, res } = buildReq({ active: false });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(prismaMock.webhook.update).toHaveBeenCalled();
  });
});
