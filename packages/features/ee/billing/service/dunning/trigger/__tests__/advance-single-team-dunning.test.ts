import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Capture the run function from schemaTask ──────────────────────────────────
let capturedRun: (payload: { billingId: string; entityType: "team" | "organization" }) => Promise<unknown>;

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: (opts: { id: string; run: typeof capturedRun }) => {
    capturedRun = opts.run;
    return { trigger: vi.fn(), batchTriggerAndWait: vi.fn(), id: opts.id };
  },
  queue: () => ({}),
}));

// ── Mock DI container ─────────────────────────────────────────────────────────
const mockFindTeamIdByBillingId = vi.fn();
const mockFindPlanNameByBillingId = vi.fn();
const mockGetDunningStatus = vi.fn();
const mockAdvanceByBillingId = vi.fn();
const mockFactory = {
  findTeamIdByBillingId: mockFindTeamIdByBillingId,
  findPlanNameByBillingId: mockFindPlanNameByBillingId,
  getDunningStatus: mockGetDunningStatus,
  advanceByBillingId: mockAdvanceByBillingId,
};

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningServiceFactory: () => mockFactory,
}));

// ── Mock shouldSkipDunningAdvancement ─────────────────────────────────────────
const mockShouldSkip = vi.fn();

vi.mock("../../shouldSkipDunningAdvancement", () => ({
  shouldSkipDunningAdvancement: (...args: unknown[]) => mockShouldSkip(...args),
}));

// ── Mock email task modules (dynamic imports in source) ───────────────────────
const mockSoftBlockTrigger = vi.fn();
const mockPauseTrigger = vi.fn();
const mockCancellationTrigger = vi.fn();

vi.mock("../send-dunning-soft-block-email", () => ({
  sendDunningSoftBlockEmail: { trigger: mockSoftBlockTrigger, id: "billing.send-dunning-soft-block-email" },
}));

vi.mock("../send-dunning-pause-email", () => ({
  sendDunningPauseEmail: { trigger: mockPauseTrigger, id: "billing.send-dunning-pause-email" },
}));

vi.mock("../send-dunning-cancellation-email", () => ({
  sendDunningCancellationEmail: {
    trigger: mockCancellationTrigger,
    id: "billing.send-dunning-cancellation-email",
  },
}));

describe("advanceSingleTeamDunning", () => {
  const payload = { billingId: "billing_123", entityType: "team" as const };

  beforeAll(async () => {
    await import("../advance-single-team-dunning");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("skips enterprise plans that are not CURRENT", async () => {
    mockFindTeamIdByBillingId.mockResolvedValue(1);
    mockFindPlanNameByBillingId.mockResolvedValue("ENTERPRISE");
    mockGetDunningStatus.mockResolvedValue("WARNING");
    mockShouldSkip.mockReturnValue(true);

    const result = await capturedRun(payload);

    expect(mockShouldSkip).toHaveBeenCalledWith("ENTERPRISE", "WARNING");
    expect(mockAdvanceByBillingId).not.toHaveBeenCalled();
    expect(result).toEqual({ advanced: false, skipped: true, reason: "enterprise" });
  });

  it("advances and triggers soft-block email when result.to is SOFT_BLOCKED", async () => {
    mockFindTeamIdByBillingId.mockResolvedValue(42);
    mockFindPlanNameByBillingId.mockResolvedValue("PRO");
    mockGetDunningStatus.mockResolvedValue("WARNING");
    mockShouldSkip.mockReturnValue(false);
    mockAdvanceByBillingId.mockResolvedValue({ advanced: true, to: "SOFT_BLOCKED" });
    mockSoftBlockTrigger.mockResolvedValue(undefined);

    const result = await capturedRun(payload);

    expect(mockAdvanceByBillingId).toHaveBeenCalledWith("billing_123", "team");
    expect(mockSoftBlockTrigger).toHaveBeenCalledWith({ teamId: 42 });
    expect(mockPauseTrigger).not.toHaveBeenCalled();
    expect(mockCancellationTrigger).not.toHaveBeenCalled();
    expect(result).toEqual({ advanced: true, to: "SOFT_BLOCKED" });
  });

  it("advances and triggers pause email when result.to is HARD_BLOCKED", async () => {
    mockFindTeamIdByBillingId.mockResolvedValue(42);
    mockFindPlanNameByBillingId.mockResolvedValue("PRO");
    mockGetDunningStatus.mockResolvedValue("SOFT_BLOCKED");
    mockShouldSkip.mockReturnValue(false);
    mockAdvanceByBillingId.mockResolvedValue({ advanced: true, to: "HARD_BLOCKED" });
    mockPauseTrigger.mockResolvedValue(undefined);

    const result = await capturedRun(payload);

    expect(mockPauseTrigger).toHaveBeenCalledWith({ teamId: 42 });
    expect(mockSoftBlockTrigger).not.toHaveBeenCalled();
    expect(mockCancellationTrigger).not.toHaveBeenCalled();
    expect(result).toEqual({ advanced: true, to: "HARD_BLOCKED" });
  });

  it("advances and triggers cancellation email when result.to is CANCELLED", async () => {
    mockFindTeamIdByBillingId.mockResolvedValue(42);
    mockFindPlanNameByBillingId.mockResolvedValue("PRO");
    mockGetDunningStatus.mockResolvedValue("HARD_BLOCKED");
    mockShouldSkip.mockReturnValue(false);
    mockAdvanceByBillingId.mockResolvedValue({ advanced: true, to: "CANCELLED" });
    mockCancellationTrigger.mockResolvedValue(undefined);

    const result = await capturedRun(payload);

    expect(mockCancellationTrigger).toHaveBeenCalledWith({ teamId: 42 });
    expect(mockSoftBlockTrigger).not.toHaveBeenCalled();
    expect(mockPauseTrigger).not.toHaveBeenCalled();
    expect(result).toEqual({ advanced: true, to: "CANCELLED" });
  });

  it("does not trigger email when advanced is false", async () => {
    mockFindTeamIdByBillingId.mockResolvedValue(42);
    mockFindPlanNameByBillingId.mockResolvedValue("PRO");
    mockGetDunningStatus.mockResolvedValue("CURRENT");
    mockShouldSkip.mockReturnValue(false);
    mockAdvanceByBillingId.mockResolvedValue({ advanced: false, to: null });

    const result = await capturedRun(payload);

    expect(mockSoftBlockTrigger).not.toHaveBeenCalled();
    expect(mockPauseTrigger).not.toHaveBeenCalled();
    expect(mockCancellationTrigger).not.toHaveBeenCalled();
    expect(result).toEqual({ advanced: false, to: null });
  });

  it("does not trigger email when teamId is null", async () => {
    mockFindTeamIdByBillingId.mockResolvedValue(null);
    mockFindPlanNameByBillingId.mockResolvedValue("PRO");
    mockGetDunningStatus.mockResolvedValue("WARNING");
    mockShouldSkip.mockReturnValue(false);
    mockAdvanceByBillingId.mockResolvedValue({ advanced: true, to: "SOFT_BLOCKED" });

    const result = await capturedRun(payload);

    expect(mockSoftBlockTrigger).not.toHaveBeenCalled();
    expect(result).toEqual({ advanced: true, to: "SOFT_BLOCKED" });
  });

  it("does not trigger email when result.to is null even if advanced", async () => {
    mockFindTeamIdByBillingId.mockResolvedValue(42);
    mockFindPlanNameByBillingId.mockResolvedValue("PRO");
    mockGetDunningStatus.mockResolvedValue("CURRENT");
    mockShouldSkip.mockReturnValue(false);
    mockAdvanceByBillingId.mockResolvedValue({ advanced: true, to: null });

    const result = await capturedRun(payload);

    expect(mockSoftBlockTrigger).not.toHaveBeenCalled();
    expect(mockPauseTrigger).not.toHaveBeenCalled();
    expect(mockCancellationTrigger).not.toHaveBeenCalled();
    expect(result).toEqual({ advanced: true, to: null });
  });

  it("works with organization entityType", async () => {
    const orgPayload = { billingId: "billing_org_1", entityType: "organization" as const };
    mockFindTeamIdByBillingId.mockResolvedValue(99);
    mockFindPlanNameByBillingId.mockResolvedValue("TEAM");
    mockGetDunningStatus.mockResolvedValue("WARNING");
    mockShouldSkip.mockReturnValue(false);
    mockAdvanceByBillingId.mockResolvedValue({ advanced: true, to: "SOFT_BLOCKED" });
    mockSoftBlockTrigger.mockResolvedValue(undefined);

    await capturedRun(orgPayload);

    expect(mockFindTeamIdByBillingId).toHaveBeenCalledWith("billing_org_1", "organization");
    expect(mockFindPlanNameByBillingId).toHaveBeenCalledWith("billing_org_1", "organization");
    expect(mockGetDunningStatus).toHaveBeenCalledWith("billing_org_1", "organization");
    expect(mockAdvanceByBillingId).toHaveBeenCalledWith("billing_org_1", "organization");
  });
});
