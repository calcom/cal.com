import type { PrismaClient } from "@calcom/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleWebhookScheduledTriggers } from "./handleWebhookScheduledTriggers";
import { DEFAULT_WEBHOOK_VERSION } from "./interface/IWebhookRepository";

describe("handleWebhookScheduledTriggers - X-Cal-Webhook-Version header", () => {
  const mockFetch = vi.fn();
  const now = new Date();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should include X-Cal-Webhook-Version header with webhook version from database", async () => {
    const webhookVersion = "2021-10-20";
    const mockPrisma = {
      webhookScheduledTriggers: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            jobName: null,
            subscriberUrl: "https://example.com/webhook",
            payload: JSON.stringify({ triggerEvent: "MEETING_ENDED" }),
            startAfter: new Date(now.getTime() - 60000), // 1 minute ago
            webhook: {
              secret: "test-secret",
              version: webhookVersion,
            },
          },
        ]),
        delete: vi.fn().mockResolvedValue({}),
      },
      webhook: {
        findUniqueOrThrow: vi.fn(),
      },
    };

    await handleWebhookScheduledTriggers(mockPrisma as unknown as PrismaClient);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toBe("https://example.com/webhook");
    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", webhookVersion);
    expect(options.headers).toHaveProperty("X-Cal-Signature-256");
  });

  it("should use DEFAULT_WEBHOOK_VERSION when webhook has no version", async () => {
    const mockPrisma = {
      webhookScheduledTriggers: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            jobName: null,
            subscriberUrl: "https://example.com/webhook",
            payload: JSON.stringify({ triggerEvent: "MEETING_STARTED" }),
            startAfter: new Date(now.getTime() - 60000),
            webhook: {
              secret: "test-secret",
              version: null, // No version set
            },
          },
        ]),
        delete: vi.fn().mockResolvedValue({}),
      },
      webhook: {
        findUniqueOrThrow: vi.fn(),
      },
    };

    await handleWebhookScheduledTriggers(mockPrisma as unknown as PrismaClient);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];

    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", DEFAULT_WEBHOOK_VERSION);
  });

  it("should use DEFAULT_WEBHOOK_VERSION when webhook relationship is null", async () => {
    const mockPrisma = {
      webhookScheduledTriggers: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            jobName: null,
            subscriberUrl: "https://example.com/webhook",
            payload: JSON.stringify({ triggerEvent: "MEETING_STARTED" }),
            startAfter: new Date(now.getTime() - 60000),
            webhook: null, // No webhook relationship
          },
        ]),
        delete: vi.fn().mockResolvedValue({}),
      },
      webhook: {
        findUniqueOrThrow: vi.fn(),
      },
    };

    await handleWebhookScheduledTriggers(mockPrisma as unknown as PrismaClient);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];

    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", DEFAULT_WEBHOOK_VERSION);
  });

  it("should fetch webhook version from database for legacy jobs using jobName", async () => {
    const webhookVersion = "2021-10-20";
    const mockPrisma = {
      webhookScheduledTriggers: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            jobName: "appId_webhookId123", // Legacy format
            subscriberUrl: "https://example.com/webhook",
            payload: JSON.stringify({ triggerEvent: "MEETING_ENDED" }),
            startAfter: new Date(now.getTime() - 60000),
            webhook: null, // No webhook relationship for legacy jobs
          },
        ]),
        delete: vi.fn().mockResolvedValue({}),
      },
      webhook: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          secret: "fetched-secret",
          version: webhookVersion,
        }),
      },
    };

    await handleWebhookScheduledTriggers(mockPrisma as unknown as PrismaClient);

    expect(mockPrisma.webhook.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "webhookId123", appId: "appId" },
      select: { secret: true, version: true },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];

    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", webhookVersion);
  });
});
