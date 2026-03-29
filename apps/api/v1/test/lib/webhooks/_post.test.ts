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

import handler from "../../../pages/api/webhooks/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

function buildReq(body: Record<string, unknown>) {
  const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
    method: "POST",
    body,
  });
  req.userId = 1;
  req.isSystemWideAdmin = false;
  return { req, res };
}

const validBody = {
  subscriberUrl: "https://example.com/webhook",
  eventTriggers: ["BOOKING_CREATED"],
  active: true,
};

describe("POST /api/v1/webhooks - SSRF Protection", () => {
  // --- Blocked URLs ---

  test("Blocks localhost subscriberUrl", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "https://localhost/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks 127.0.0.1 subscriberUrl", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "https://127.0.0.1/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks AWS metadata endpoint 169.254.169.254", async () => {
    const { req, res } = buildReq({
      ...validBody,
      subscriberUrl: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks GCP metadata endpoint", async () => {
    const { req, res } = buildReq({
      ...validBody,
      subscriberUrl: "https://metadata.google.internal/computeMetadata/v1/",
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks private IP 10.x.x.x", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "https://10.0.0.1/internal" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks private IP 172.16.x.x", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "https://172.16.0.1/internal" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks private IP 192.168.x.x", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "https://192.168.1.1/internal" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks 0.0.0.0", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "https://0.0.0.0/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks HTTP (non-HTTPS) URLs", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "http://example.com/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks IPv6 loopback ::1", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "https://[::1]/hook" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  test("Blocks IPv4-mapped IPv6 for private IP", async () => {
    const { req, res } = buildReq({
      ...validBody,
      subscriberUrl: "https://[::ffff:127.0.0.1]/hook",
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain("not allowed");
  });

  // --- Invalid URL format (Zod validation) ---

  test("Rejects non-URL subscriberUrl", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "not-a-url" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test("Rejects empty subscriberUrl", async () => {
    const { req, res } = buildReq({ ...validBody, subscriberUrl: "" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  // --- Allowed URLs ---

  test("Allows valid HTTPS subscriberUrl", async () => {
    prismaMock.webhook.create.mockResolvedValue({
      id: "test-id",
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
    } as any);

    const { req, res } = buildReq(validBody);
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(prismaMock.webhook.create).toHaveBeenCalled();
  });
});
