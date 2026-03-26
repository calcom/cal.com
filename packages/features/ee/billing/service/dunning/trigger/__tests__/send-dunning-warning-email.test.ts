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
const mockSendWarningEmail = vi.fn();

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningEmailService: () => ({
    sendWarningEmail: mockSendWarningEmail,
  }),
}));

describe("sendDunningWarningEmail", () => {
  beforeAll(async () => {
    await import("../send-dunning-warning-email");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls sendWarningEmail with the teamId", async () => {
    mockSendWarningEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 42 });

    expect(mockSendWarningEmail).toHaveBeenCalledWith(42);
    expect(mockSendWarningEmail).toHaveBeenCalledOnce();
  });

  it("propagates errors from the email service", async () => {
    mockSendWarningEmail.mockRejectedValue(new Error("SMTP failure"));

    await expect(capturedRun({ teamId: 1 })).rejects.toThrow("SMTP failure");
  });
});
