import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Capture the run function from schemaTask ──────────────────────────────────
let capturedRun: (payload: { dryRun: boolean; excludedTeamIds: number[] }) => Promise<unknown>;

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: (opts: { id: string; run: typeof capturedRun }) => {
    capturedRun = opts.run;
    return { trigger: vi.fn(), batchTriggerAndWait: vi.fn(), id: opts.id };
  },
  queue: () => ({}),
}));

// ── Mock prisma ───────────────────────────────────────────────────────────────
const mockTeamDunningStatusFindMany = vi.fn();
const mockOrgDunningStatusFindMany = vi.fn();

vi.mock("@calcom/prisma", () => ({
  default: {
    teamDunningStatus: { findMany: (...args: unknown[]) => mockTeamDunningStatusFindMany(...args) },
    organizationDunningStatus: {
      findMany: (...args: unknown[]) => mockOrgDunningStatusFindMany(...args),
    },
  },
}));

// ── Mock sendDunningEmailForStatus task ───────────────────────────────────────
const mockBatchTriggerAndWait = vi.fn();

vi.mock("../send-dunning-email-for-status", () => ({
  sendDunningEmailForStatus: {
    batchTriggerAndWait: mockBatchTriggerAndWait,
    trigger: vi.fn(),
    id: "billing.send-dunning-email-for-status",
  },
}));

describe("blastDunningEmails", () => {
  beforeAll(async () => {
    await import("../blast-dunning-emails");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns dry run result with zero rows when no dunning statuses exist", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([]);
    mockOrgDunningStatusFindMany.mockResolvedValue([]);

    const result = await capturedRun({ dryRun: true, excludedTeamIds: [] });

    expect(result).toEqual({
      total: 0,
      excluded: 0,
      dryRun: true,
      statusCounts: {},
      sent: 0,
      failed: 0,
    });
    expect(mockBatchTriggerAndWait).not.toHaveBeenCalled();
  });

  it("returns dry run result with correct status counts without sending", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([
      { id: "t1", status: "WARNING", teamBilling: { teamId: 1 } },
      { id: "t2", status: "SOFT_BLOCKED", teamBilling: { teamId: 2 } },
      { id: "t3", status: "WARNING", teamBilling: { teamId: 3 } },
    ]);
    mockOrgDunningStatusFindMany.mockResolvedValue([
      { id: "o1", status: "HARD_BLOCKED", organizationBilling: { teamId: 10 } },
    ]);

    const result = await capturedRun({ dryRun: true, excludedTeamIds: [] });

    expect(result).toEqual({
      total: 4,
      excluded: 0,
      dryRun: true,
      statusCounts: { WARNING: 2, SOFT_BLOCKED: 1, HARD_BLOCKED: 1 },
      sent: 0,
      failed: 0,
    });
    expect(mockBatchTriggerAndWait).not.toHaveBeenCalled();
  });

  it("sends emails in batches for non-dry-run with rows", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([
      { id: "t1", status: "WARNING", teamBilling: { teamId: 1 } },
      { id: "t2", status: "SOFT_BLOCKED", teamBilling: { teamId: 2 } },
    ]);
    mockOrgDunningStatusFindMany.mockResolvedValue([]);
    mockBatchTriggerAndWait.mockResolvedValue({
      runs: [{ ok: true }, { ok: true }],
    });

    const result = await capturedRun({ dryRun: false, excludedTeamIds: [] });

    expect(mockBatchTriggerAndWait).toHaveBeenCalledWith([
      { payload: { teamId: 1, status: "WARNING" } },
      { payload: { teamId: 2, status: "SOFT_BLOCKED" } },
    ]);
    expect(result).toEqual({
      total: 2,
      excluded: 0,
      sent: 2,
      failed: 0,
      dryRun: false,
    });
  });

  it("excludes specified team IDs", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([
      { id: "t1", status: "WARNING", teamBilling: { teamId: 1 } },
      { id: "t2", status: "WARNING", teamBilling: { teamId: 2 } },
      { id: "t3", status: "WARNING", teamBilling: { teamId: 3 } },
    ]);
    mockOrgDunningStatusFindMany.mockResolvedValue([]);
    mockBatchTriggerAndWait.mockResolvedValue({
      runs: [{ ok: true }],
    });

    const result = await capturedRun({ dryRun: false, excludedTeamIds: [1, 3] });

    expect(mockBatchTriggerAndWait).toHaveBeenCalledWith([
      { payload: { teamId: 2, status: "WARNING" } },
    ]);
    expect(result).toEqual({
      total: 1,
      excluded: 2,
      sent: 1,
      failed: 0,
      dryRun: false,
    });
  });

  it("returns empty result when all rows are excluded (non-dry-run)", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([
      { id: "t1", status: "WARNING", teamBilling: { teamId: 1 } },
    ]);
    mockOrgDunningStatusFindMany.mockResolvedValue([]);

    const result = await capturedRun({ dryRun: false, excludedTeamIds: [1] });

    expect(mockBatchTriggerAndWait).not.toHaveBeenCalled();
    expect(result).toEqual({
      total: 0,
      excluded: 1,
      dryRun: false,
      statusCounts: {},
      sent: 0,
      failed: 0,
    });
  });

  it("paginates team dunning statuses correctly", async () => {
    // First call returns a full page (simulating PAGE_SIZE records), second call returns empty
    const fullPage = Array.from({ length: 500 }, (_, i) => ({
      id: `t${i}`,
      status: "WARNING",
      teamBilling: { teamId: i + 1 },
    }));
    mockTeamDunningStatusFindMany.mockResolvedValueOnce(fullPage).mockResolvedValueOnce([]);
    mockOrgDunningStatusFindMany.mockResolvedValue([]);

    // Return batch results for each batch of 100
    for (let i = 0; i < 5; i++) {
      mockBatchTriggerAndWait.mockResolvedValueOnce({
        runs: Array.from({ length: 100 }, () => ({ ok: true })),
      });
    }

    const result = await capturedRun({ dryRun: false, excludedTeamIds: [] });

    // Should have paginated: 2 calls for teams (full page + empty), 1 for orgs
    expect(mockTeamDunningStatusFindMany).toHaveBeenCalledTimes(2);
    // Second call should use cursor
    const secondCallArgs = mockTeamDunningStatusFindMany.mock.calls[1][0];
    expect(secondCallArgs).toMatchObject({
      skip: 1,
      cursor: { id: "t499" },
    });

    expect(mockBatchTriggerAndWait).toHaveBeenCalledTimes(5);
    expect(result).toEqual({
      total: 500,
      excluded: 0,
      sent: 500,
      failed: 0,
      dryRun: false,
    });
  });

  it("paginates organization dunning statuses correctly", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([]);

    const fullPage = Array.from({ length: 500 }, (_, i) => ({
      id: `o${i}`,
      status: "CANCELLED",
      organizationBilling: { teamId: i + 1000 },
    }));
    mockOrgDunningStatusFindMany.mockResolvedValueOnce(fullPage).mockResolvedValueOnce([]);

    for (let i = 0; i < 5; i++) {
      mockBatchTriggerAndWait.mockResolvedValueOnce({
        runs: Array.from({ length: 100 }, () => ({ ok: true })),
      });
    }

    const result = await capturedRun({ dryRun: false, excludedTeamIds: [] });

    expect(mockOrgDunningStatusFindMany).toHaveBeenCalledTimes(2);
    const secondOrgCall = mockOrgDunningStatusFindMany.mock.calls[1][0];
    expect(secondOrgCall).toMatchObject({
      skip: 1,
      cursor: { id: "o499" },
    });
    expect(result).toEqual({
      total: 500,
      excluded: 0,
      sent: 500,
      failed: 0,
      dryRun: false,
    });
  });

  it("counts failed batch runs", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([
      { id: "t1", status: "WARNING", teamBilling: { teamId: 1 } },
      { id: "t2", status: "WARNING", teamBilling: { teamId: 2 } },
    ]);
    mockOrgDunningStatusFindMany.mockResolvedValue([]);
    mockBatchTriggerAndWait.mockResolvedValue({
      runs: [{ ok: false }, { ok: true }],
    });

    const result = await capturedRun({ dryRun: false, excludedTeamIds: [] });

    expect(result).toEqual({
      total: 2,
      excluded: 0,
      sent: 1,
      failed: 1,
      dryRun: false,
    });
  });

  it("combines team and organization rows", async () => {
    mockTeamDunningStatusFindMany.mockResolvedValue([
      { id: "t1", status: "WARNING", teamBilling: { teamId: 1 } },
    ]);
    mockOrgDunningStatusFindMany.mockResolvedValue([
      { id: "o1", status: "SOFT_BLOCKED", organizationBilling: { teamId: 100 } },
    ]);
    mockBatchTriggerAndWait.mockResolvedValue({
      runs: [{ ok: true }, { ok: true }],
    });

    const result = await capturedRun({ dryRun: false, excludedTeamIds: [] });

    expect(mockBatchTriggerAndWait).toHaveBeenCalledWith([
      { payload: { teamId: 1, status: "WARNING" } },
      { payload: { teamId: 100, status: "SOFT_BLOCKED" } },
    ]);
    expect(result).toEqual({
      total: 2,
      excluded: 0,
      sent: 2,
      failed: 0,
      dryRun: false,
    });
  });
});
