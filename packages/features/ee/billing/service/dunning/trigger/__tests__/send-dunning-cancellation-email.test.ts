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
const mockSendCancellationEmail = vi.fn();

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningEmailService: () => ({
    sendCancellationEmail: mockSendCancellationEmail,
  }),
}));

describe("sendDunningCancellationEmail", () => {
  beforeAll(async () => {
    await import("../send-dunning-cancellation-email");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls sendCancellationEmail with the teamId", async () => {
    mockSendCancellationEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 42 });

    expect(mockSendCancellationEmail).toHaveBeenCalledWith(42);
    expect(mockSendCancellationEmail).toHaveBeenCalledOnce();
  });

  it("propagates errors from the email service", async () => {
    mockSendCancellationEmail.mockRejectedValue(new Error("SMTP failure"));

    await expect(capturedRun({ teamId: 1 })).rejects.toThrow("SMTP failure");
  });
});
