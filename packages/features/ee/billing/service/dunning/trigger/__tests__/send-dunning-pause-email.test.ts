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
const mockSendPauseEmail = vi.fn();

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningEmailService: () => ({
    sendPauseEmail: mockSendPauseEmail,
  }),
}));

describe("sendDunningPauseEmail", () => {
  beforeAll(async () => {
    await import("../send-dunning-pause-email");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls sendPauseEmail with the teamId", async () => {
    mockSendPauseEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 42 });

    expect(mockSendPauseEmail).toHaveBeenCalledWith(42);
    expect(mockSendPauseEmail).toHaveBeenCalledOnce();
  });

  it("propagates errors from the email service", async () => {
    mockSendPauseEmail.mockRejectedValue(new Error("SMTP failure"));

    await expect(capturedRun({ teamId: 1 })).rejects.toThrow("SMTP failure");
  });
});
