import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Capture the run function from schemaTask ──────────────────────────────────
let capturedRun: (payload: {
  teamId: number;
  status: "WARNING" | "SOFT_BLOCKED" | "HARD_BLOCKED" | "CANCELLED";
}) => Promise<unknown>;

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: (opts: { id: string; run: typeof capturedRun }) => {
    capturedRun = opts.run;
    return { trigger: vi.fn(), batchTriggerAndWait: vi.fn(), id: opts.id };
  },
  queue: () => ({}),
}));

// ── Mock DI container ─────────────────────────────────────────────────────────
const mockSendWarningEmail = vi.fn();
const mockSendSoftBlockEmail = vi.fn();
const mockSendPauseEmail = vi.fn();
const mockSendCancellationEmail = vi.fn();

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningEmailService: () => ({
    sendWarningEmail: mockSendWarningEmail,
    sendSoftBlockEmail: mockSendSoftBlockEmail,
    sendPauseEmail: mockSendPauseEmail,
    sendCancellationEmail: mockSendCancellationEmail,
  }),
}));

describe("sendDunningEmailForStatus", () => {
  beforeAll(async () => {
    await import("../send-dunning-email-for-status");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sends warning email for WARNING status", async () => {
    mockSendWarningEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 1, status: "WARNING" });

    expect(mockSendWarningEmail).toHaveBeenCalledWith(1);
    expect(mockSendSoftBlockEmail).not.toHaveBeenCalled();
    expect(mockSendPauseEmail).not.toHaveBeenCalled();
    expect(mockSendCancellationEmail).not.toHaveBeenCalled();
  });

  it("sends soft-block email for SOFT_BLOCKED status", async () => {
    mockSendSoftBlockEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 2, status: "SOFT_BLOCKED" });

    expect(mockSendSoftBlockEmail).toHaveBeenCalledWith(2);
    expect(mockSendWarningEmail).not.toHaveBeenCalled();
    expect(mockSendPauseEmail).not.toHaveBeenCalled();
    expect(mockSendCancellationEmail).not.toHaveBeenCalled();
  });

  it("sends pause email for HARD_BLOCKED status", async () => {
    mockSendPauseEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 3, status: "HARD_BLOCKED" });

    expect(mockSendPauseEmail).toHaveBeenCalledWith(3);
    expect(mockSendWarningEmail).not.toHaveBeenCalled();
    expect(mockSendSoftBlockEmail).not.toHaveBeenCalled();
    expect(mockSendCancellationEmail).not.toHaveBeenCalled();
  });

  it("sends cancellation email for CANCELLED status", async () => {
    mockSendCancellationEmail.mockResolvedValue(undefined);

    await capturedRun({ teamId: 4, status: "CANCELLED" });

    expect(mockSendCancellationEmail).toHaveBeenCalledWith(4);
    expect(mockSendWarningEmail).not.toHaveBeenCalled();
    expect(mockSendSoftBlockEmail).not.toHaveBeenCalled();
    expect(mockSendPauseEmail).not.toHaveBeenCalled();
  });
});
