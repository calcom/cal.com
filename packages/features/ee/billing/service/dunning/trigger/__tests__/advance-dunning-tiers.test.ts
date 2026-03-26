import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Capture the run function from schedules.task ──────────────────────────────
let capturedRun: (...args: unknown[]) => Promise<unknown>;

vi.mock("@trigger.dev/sdk", () => ({
  schedules: {
    task: (opts: { id: string; run: (...args: unknown[]) => Promise<unknown> }) => {
      capturedRun = opts.run;
      return { trigger: vi.fn(), batchTriggerAndWait: vi.fn(), id: opts.id };
    },
  },
  schemaTask: (opts: { id: string; run: (...args: unknown[]) => Promise<unknown> }) => {
    return { trigger: vi.fn(), batchTriggerAndWait: vi.fn(), id: opts.id };
  },
  queue: () => ({}),
}));

// ── Mock DI container ─────────────────────────────────────────────────────────
const mockGetAdvancementCandidates = vi.fn();
const mockFactory = { getAdvancementCandidates: mockGetAdvancementCandidates };

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningServiceFactory: () => mockFactory,
}));

// ── Mock the advance-single-team-dunning task (static import) ─────────────────
const mockBatchTriggerAndWait = vi.fn();

vi.mock("../advance-single-team-dunning", () => ({
  advanceSingleTeamDunning: {
    batchTriggerAndWait: mockBatchTriggerAndWait,
    trigger: vi.fn(),
    id: "billing.advance-single-team-dunning",
  },
}));

describe("advanceDunningTiersTask", () => {
  beforeAll(async () => {
    await import("../advance-dunning-tiers");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns zeros when there are no candidates", async () => {
    mockGetAdvancementCandidates.mockResolvedValue([]);

    const result = await capturedRun();

    expect(mockGetAdvancementCandidates).toHaveBeenCalledOnce();
    expect(mockBatchTriggerAndWait).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });

  it("triggers advance-single-team-dunning for each candidate and counts results", async () => {
    const candidates = [
      { billingId: "billing_1", entityType: "team" as const },
      { billingId: "billing_2", entityType: "organization" as const },
      { billingId: "billing_3", entityType: "team" as const },
    ];
    mockGetAdvancementCandidates.mockResolvedValue(candidates);
    mockBatchTriggerAndWait.mockResolvedValue({
      runs: [{ ok: true }, { ok: false }, { ok: true }],
    });

    const result = await capturedRun();

    expect(mockBatchTriggerAndWait).toHaveBeenCalledWith([
      { payload: { billingId: "billing_1", entityType: "team" } },
      { payload: { billingId: "billing_2", entityType: "organization" } },
      { payload: { billingId: "billing_3", entityType: "team" } },
    ]);
    expect(result).toEqual({ total: 3, succeeded: 2, failed: 1 });
  });

  it("reports all succeeded when every run is ok", async () => {
    mockGetAdvancementCandidates.mockResolvedValue([{ billingId: "b1", entityType: "team" }]);
    mockBatchTriggerAndWait.mockResolvedValue({
      runs: [{ ok: true }],
    });

    const result = await capturedRun();

    expect(result).toEqual({ total: 1, succeeded: 1, failed: 0 });
  });

  it("reports all failed when every run fails", async () => {
    mockGetAdvancementCandidates.mockResolvedValue([
      { billingId: "b1", entityType: "team" },
      { billingId: "b2", entityType: "team" },
    ]);
    mockBatchTriggerAndWait.mockResolvedValue({
      runs: [{ ok: false }, { ok: false }],
    });

    const result = await capturedRun();

    expect(result).toEqual({ total: 2, succeeded: 0, failed: 2 });
  });
});
