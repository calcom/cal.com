import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@calcom/features/di/webhooks/containers/webhook", () => ({
  getWebhookFeature: vi.fn(),
}));

vi.mock("./sendPayload", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { getWebhookFeature } from "@calcom/features/di/webhooks/containers/webhook";
import sendPayload from "./sendPayload";
import { triggerDelegationCredentialErrorWebhook } from "./triggerDelegationCredentialErrorWebhook";

describe("triggerDelegationCredentialErrorWebhook", () => {
  const baseParams = {
    error: Object.assign(new Error("Calendar sync failed"), { constructor: { name: "CalendarAppError" } }),
    credential: { id: 1, type: "google_calendar", appId: "google-calendar" },
    user: { id: 5, email: "user@example.com" },
    delegationCredentialId: "dc-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return early when delegation credential not found", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(null);

    await triggerDelegationCredentialErrorWebhook(baseParams);

    expect(getWebhookFeature).not.toHaveBeenCalled();
    expect(sendPayload).not.toHaveBeenCalled();
  });

  it("should return early when no webhooks subscribed", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue({
      id: "dc-1",
      organizationId: 10,
    } as never);

    const mockRepo = { findByOrgIdAndTrigger: vi.fn().mockResolvedValue([]) };
    vi.mocked(getWebhookFeature).mockReturnValue({ repository: mockRepo } as never);

    await triggerDelegationCredentialErrorWebhook(baseParams);

    expect(sendPayload).not.toHaveBeenCalled();
  });

  it("should send payload to all subscribed webhooks", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue({
      id: "dc-1",
      organizationId: 10,
    } as never);

    const webhooks = [
      { id: "wh-1", subscriberUrl: "https://hook1.com", secret: "s1" },
      { id: "wh-2", subscriberUrl: "https://hook2.com", secret: "s2" },
    ];
    const mockRepo = { findByOrgIdAndTrigger: vi.fn().mockResolvedValue(webhooks) };
    vi.mocked(getWebhookFeature).mockReturnValue({ repository: mockRepo } as never);
    vi.mocked(sendPayload).mockResolvedValue({ ok: true, status: 200 });

    await triggerDelegationCredentialErrorWebhook(baseParams);

    expect(sendPayload).toHaveBeenCalledTimes(2);
    expect(sendPayload).toHaveBeenCalledWith(
      "s1",
      "DELEGATION_CREDENTIAL_ERROR",
      expect.any(String),
      webhooks[0],
      expect.objectContaining({
        error: expect.objectContaining({ message: "Calendar sync failed" }),
        credential: expect.objectContaining({ id: 1, type: "google_calendar" }),
        user: expect.objectContaining({ id: 5, email: "user@example.com" }),
      })
    );
  });

  it("should continue sending to other webhooks when one fails", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue({
      id: "dc-1",
      organizationId: 10,
    } as never);

    const webhooks = [
      { id: "wh-1", subscriberUrl: "https://hook1.com", secret: "s1" },
      { id: "wh-2", subscriberUrl: "https://hook2.com", secret: "s2" },
    ];
    const mockRepo = { findByOrgIdAndTrigger: vi.fn().mockResolvedValue(webhooks) };
    vi.mocked(getWebhookFeature).mockReturnValue({ repository: mockRepo } as never);

    vi.mocked(sendPayload)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    await triggerDelegationCredentialErrorWebhook(baseParams);

    expect(sendPayload).toHaveBeenCalledTimes(2);
  });

  it("should not throw when the entire function encounters an error", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockRejectedValue(new Error("DB down"));

    await expect(triggerDelegationCredentialErrorWebhook(baseParams)).resolves.toBeUndefined();
  });

  it("should include delegationCredentialId in payload credential", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue({
      id: "dc-1",
      organizationId: 10,
    } as never);

    const webhooks = [{ id: "wh-1", subscriberUrl: "https://hook1.com", secret: null }];
    const mockRepo = { findByOrgIdAndTrigger: vi.fn().mockResolvedValue(webhooks) };
    vi.mocked(getWebhookFeature).mockReturnValue({ repository: mockRepo } as never);
    vi.mocked(sendPayload).mockResolvedValue({ ok: true, status: 200 });

    await triggerDelegationCredentialErrorWebhook(baseParams);

    const payloadArg = vi.mocked(sendPayload).mock.calls[0][4];
    expect((payloadArg as Record<string, unknown>).credential).toEqual(
      expect.objectContaining({ delegationCredentialId: "dc-1" })
    );
  });

  it("should include organizationId in user payload", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue({
      id: "dc-1",
      organizationId: 10,
    } as never);

    const webhooks = [{ id: "wh-1", subscriberUrl: "https://hook1.com", secret: null }];
    const mockRepo = { findByOrgIdAndTrigger: vi.fn().mockResolvedValue(webhooks) };
    vi.mocked(getWebhookFeature).mockReturnValue({ repository: mockRepo } as never);
    vi.mocked(sendPayload).mockResolvedValue({ ok: true, status: 200 });

    await triggerDelegationCredentialErrorWebhook(baseParams);

    const payloadArg = vi.mocked(sendPayload).mock.calls[0][4];
    expect((payloadArg as Record<string, unknown>).user).toEqual(
      expect.objectContaining({ organizationId: 10 })
    );
  });
});
