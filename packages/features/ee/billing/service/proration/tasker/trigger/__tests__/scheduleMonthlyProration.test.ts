import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so mock functions exist before vi.mock runs
const mocks = vi.hoisted(() => ({
  schedulesTask: vi.fn((opts: any) => ({ ...opts, batchTriggerAndWait: vi.fn() })),
  schemaTask: vi.fn((opts: any) => ({ ...opts, trigger: vi.fn(), batchTriggerAndWait: vi.fn() })),
  queue: vi.fn((opts: any) => opts),
  batchTriggerAndWait: vi.fn(),
  subMonths: vi.fn(),
  checkIfFeatureIsEnabledGlobally: vi.fn(),
  getAnnualTeamsWithSeatChanges: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({
  schedules: {
    task: mocks.schedulesTask,
  },
  schemaTask: mocks.schemaTask,
  queue: mocks.queue,
}));

vi.mock("../processMonthlyProrationBatch", () => ({
  processMonthlyProrationBatch: {
    id: "billing.monthly-proration.batch",
    batchTriggerAndWait: mocks.batchTriggerAndWait,
  },
}));

vi.mock("date-fns", () => ({
  subMonths: (...args: any[]) => mocks.subMonths(...args),
}));

vi.mock("@calcom/lib/triggerDevLogger", () => ({
  TriggerDevLogger: class MockTriggerDevLogger {
    getSubLogger() {
      return {
        info: mocks.logInfo,
        warn: mocks.logWarn,
        error: vi.fn(),
        debug: vi.fn(),
      };
    }
  },
}));

vi.mock("@calcom/features/ee/billing/lib/month-key", () => ({
  formatMonthKey: vi.fn((date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }),
  isValidMonthKey: vi.fn((value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)),
}));

vi.mock("@calcom/features/ee/billing/repository/proration/MonthlyProrationTeamRepository", () => ({
  MonthlyProrationTeamRepository: class MockMonthlyProrationTeamRepository {
    getAnnualTeamsWithSeatChanges = mocks.getAnnualTeamsWithSeatChanges;
  },
}));

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: () => ({
    checkIfFeatureIsEnabledGlobally: mocks.checkIfFeatureIsEnabledGlobally,
  }),
}));

// Import module under test
await import("../scheduleMonthlyProration");

// Extract the run function from the schedules.task call
const taskConfig = mocks.schedulesTask.mock.calls[0]?.[0];
const runFn = taskConfig?.run as (payload: { externalId?: string; [key: string]: any }) => Promise<any>;

describe("scheduleMonthlyProration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set a fixed date: March 15, 2026 UTC
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 15, 10, 0, 0)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should be defined with correct task id and cron", () => {
    expect(taskConfig.id).toBe("billing.monthly-proration.schedule");
    expect(taskConfig.cron).toEqual({ pattern: "0 0 1 * *", timezone: "UTC" });
  });

  it("should return disabled status when feature flag is off", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

    const result = await runFn({});

    expect(result).toEqual({ status: "disabled" });
    expect(mocks.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith("monthly-proration");
    expect(mocks.getAnnualTeamsWithSeatChanges).not.toHaveBeenCalled();
  });

  it("should use monthKey from externalId when valid", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mocks.getAnnualTeamsWithSeatChanges.mockResolvedValue([]);

    const result = await runFn({ externalId: "2025-11" });

    expect(result).toEqual({ monthKey: "2025-11", scheduledTasks: 0 });
    expect(mocks.getAnnualTeamsWithSeatChanges).toHaveBeenCalledWith("2025-11");
  });

  it("should compute previous month when externalId is invalid", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mocks.getAnnualTeamsWithSeatChanges.mockResolvedValue([]);
    // subMonths should return Feb 2026 when given March 1 2026
    mocks.subMonths.mockReturnValue(new Date(Date.UTC(2026, 1, 1)));

    const result = await runFn({ externalId: "not-valid" });

    expect(result).toEqual({ monthKey: "2026-02", scheduledTasks: 0 });
    // subMonths called with the start of current month
    expect(mocks.subMonths).toHaveBeenCalledWith(new Date(Date.UTC(2026, 2, 1)), 1);
  });

  it("should compute previous month when externalId is undefined", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mocks.getAnnualTeamsWithSeatChanges.mockResolvedValue([]);
    mocks.subMonths.mockReturnValue(new Date(Date.UTC(2026, 1, 1)));

    const result = await runFn({});

    expect(result).toEqual({ monthKey: "2026-02", scheduledTasks: 0 });
  });

  it("should return scheduledTasks 0 when no teams have seat changes", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mocks.getAnnualTeamsWithSeatChanges.mockResolvedValue([]);

    const result = await runFn({ externalId: "2026-01" });

    expect(result).toEqual({ monthKey: "2026-01", scheduledTasks: 0 });
    expect(mocks.batchTriggerAndWait).not.toHaveBeenCalled();
  });

  it("should fan out batch tasks for teams with seat changes", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mocks.getAnnualTeamsWithSeatChanges.mockResolvedValue([10, 20, 30]);
    mocks.batchTriggerAndWait.mockResolvedValue({
      runs: [
        { id: "run-1", ok: true },
        { id: "run-2", ok: true },
        { id: "run-3", ok: true },
      ],
    });

    const result = await runFn({ externalId: "2026-01" });

    expect(mocks.batchTriggerAndWait).toHaveBeenCalledWith([
      { payload: { monthKey: "2026-01", teamIds: [10] } },
      { payload: { monthKey: "2026-01", teamIds: [20] } },
      { payload: { monthKey: "2026-01", teamIds: [30] } },
    ]);

    expect(result).toEqual({
      monthKey: "2026-01",
      totalTeams: 3,
      succeeded: 3,
      failed: 0,
    });
  });

  it("should report failed tasks in results", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mocks.getAnnualTeamsWithSeatChanges.mockResolvedValue([10, 20, 30]);
    mocks.batchTriggerAndWait.mockResolvedValue({
      runs: [
        { id: "run-1", ok: true },
        { id: "run-2", ok: false },
        { id: "run-3", ok: false },
      ],
    });

    const result = await runFn({ externalId: "2026-02" });

    expect(result).toEqual({
      monthKey: "2026-02",
      totalTeams: 3,
      succeeded: 1,
      failed: 2,
    });
    expect(mocks.logWarn).toHaveBeenCalledWith(
      "2 proration tasks failed",
      expect.objectContaining({
        failedRunIds: ["run-2", "run-3"],
      })
    );
  });

  it("should handle single team case", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mocks.getAnnualTeamsWithSeatChanges.mockResolvedValue([42]);
    mocks.batchTriggerAndWait.mockResolvedValue({
      runs: [{ id: "run-42", ok: true }],
    });

    const result = await runFn({ externalId: "2026-06" });

    expect(mocks.batchTriggerAndWait).toHaveBeenCalledWith([
      { payload: { monthKey: "2026-06", teamIds: [42] } },
    ]);
    expect(result).toEqual({
      monthKey: "2026-06",
      totalTeams: 1,
      succeeded: 1,
      failed: 0,
    });
  });
});
