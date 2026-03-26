import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Capture the run function from schemaTask ──────────────────────────────────
let capturedRun: (payload: { teamId: number }) => Promise<unknown>;

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: (opts: { id: string; run: typeof capturedRun }) => {
    capturedRun = opts.run;
    return { trigger: vi.fn(), batchTriggerAndWait: vi.fn(), id: opts.id };
  },
  queue: () => ({}),
}));

// ── Mock DI container ─────────────────────────────────────────────────────────
const mockSendSoftBlockEmail = vi.fn();

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningEmailService: () => ({
    sendSoftBlockEmail: mockSendSoftBlockEmail,
  }),
}));

describe("sendDunningSoftBlockEmail", () => {
  beforeAll(async () => {
    await import("../send-dunning-soft-block-email");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls sendSoftBlockEmail with the teamId", async () => {
    mockSendSoftBlockEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 42 });

    expect(mockSendSoftBlockEmail).toHaveBeenCalledWith(42);
    expect(mockSendSoftBlockEmail).toHaveBeenCalledOnce();
  });

  it("propagates errors from the email service", async () => {
    mockSendSoftBlockEmail.mockRejectedValue(new Error("SMTP failure"));

    await expect(capturedRun({ teamId: 1 })).rejects.toThrow("SMTP failure");
  });
});
