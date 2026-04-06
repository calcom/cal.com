import { validateUrlForSSRF } from "@calcom/lib/ssrfProtection";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addSubscription } from "./scheduleTrigger";

vi.mock("@calcom/lib/ssrfProtection", () => ({
  validateUrlForSSRF: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {
    webhook: { create: vi.fn() },
    booking: { findMany: vi.fn() },
  },
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

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid"),
}));

const VALID_PARAMS = {
  triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  subscriberUrl: "https://hooks.zapier.com/hooks/standard/123/abc/",
  appId: "zapier",
  account: { id: 1, name: "Test", isTeam: false },
};

describe("addSubscription SSRF validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates webhook when URL is valid", async () => {
    vi.mocked(validateUrlForSSRF).mockResolvedValue({ isValid: true });
    vi.mocked(prisma.webhook.create).mockResolvedValue({
      id: "mock-uuid",
      subscriberUrl: VALID_PARAMS.subscriberUrl,
    } as Awaited<ReturnType<typeof prisma.webhook.create>>);

    const result = await addSubscription(VALID_PARAMS);

    expect(validateUrlForSSRF).toHaveBeenCalledWith(VALID_PARAMS.subscriberUrl);
    expect(prisma.webhook.create).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("does not create webhook when URL is blocked", async () => {
    vi.mocked(validateUrlForSSRF).mockResolvedValue({ isValid: false, error: "Blocked hostname" });

    const result = await addSubscription({
      ...VALID_PARAMS,
      subscriberUrl: "http://169.254.169.254/latest/meta-data/",
    });

    expect(validateUrlForSSRF).toHaveBeenCalledWith("http://169.254.169.254/latest/meta-data/");
    expect(prisma.webhook.create).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("does not create webhook when URL resolves to private IP", async () => {
    vi.mocked(validateUrlForSSRF).mockResolvedValue({
      isValid: false,
      error: "Hostname resolves to private IP",
    });

    const result = await addSubscription({
      ...VALID_PARAMS,
      subscriberUrl: "https://evil.example.com/",
    });

    expect(prisma.webhook.create).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
