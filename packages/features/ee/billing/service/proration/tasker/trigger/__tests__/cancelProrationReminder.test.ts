import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so mock functions exist before vi.mock runs
const mocks = vi.hoisted(() => ({
  schemaTask: vi.fn((opts: any) => ({ ...opts, trigger: vi.fn(), batchTriggerAndWait: vi.fn() })),
  queue: vi.fn((opts: any) => opts),
  runsCancel: vi.fn(),
  runsList: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: mocks.schemaTask,
  runs: {
    list: (...args: any[]) => mocks.runsList(...args),
    cancel: (...args: any[]) => mocks.runsCancel(...args),
  },
  queue: mocks.queue,
}));

vi.mock("../sendProrationReminderEmail", () => ({
  sendProrationReminderEmail: {
    id: "billing.proration.send-reminder-email",
    trigger: vi.fn(),
  },
}));

// Import module under test
await import("../cancelProrationReminder");

// Extract the run function
const taskConfig = mocks.schemaTask.mock.calls[0]?.[0];
const runFn = taskConfig?.run as (payload: { prorationId: string }) => Promise<any>;

describe("cancelProrationReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined with correct task id", () => {
    expect(taskConfig.id).toBe("billing.proration.cancel-reminder");
  });

  it("should cancel runs matching the proration idempotency key", async () => {
    const runs = [
      { id: "run-1", idempotencyKey: "proration-reminder-pror-123" },
      { id: "run-2", idempotencyKey: "proration-reminder-other" },
      { id: "run-3", idempotencyKey: "proration-reminder-pror-123" },
    ];

    mocks.runsList.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const run of runs) {
          yield run;
        }
      },
    });
    mocks.runsCancel.mockResolvedValue({});

    const result = await runFn({ prorationId: "pror-123" });

    expect(mocks.runsList).toHaveBeenCalledWith({
      taskIdentifier: ["billing.proration.send-reminder-email"],
      status: ["DELAYED", "WAITING_FOR_DEPLOY", "QUEUED", "PENDING"],
    });

    // Should cancel only the matching runs
    expect(mocks.runsCancel).toHaveBeenCalledTimes(2);
    expect(mocks.runsCancel).toHaveBeenCalledWith("run-1");
    expect(mocks.runsCancel).toHaveBeenCalledWith("run-3");

    expect(result).toEqual({ success: true });
  });

  it("should not cancel any runs when none match the idempotency key", async () => {
    const runs = [
      { id: "run-1", idempotencyKey: "proration-reminder-other-id" },
      { id: "run-2", idempotencyKey: "proration-reminder-different" },
    ];

    mocks.runsList.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const run of runs) {
          yield run;
        }
      },
    });

    const result = await runFn({ prorationId: "pror-999" });

    expect(mocks.runsCancel).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("should handle empty runs list", async () => {
    mocks.runsList.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        // Yields nothing
      },
    });

    const result = await runFn({ prorationId: "pror-empty" });

    expect(mocks.runsCancel).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("should construct the correct idempotency key from prorationId", async () => {
    const prorationId = "550e8400-e29b-41d4-a716-446655440000";
    const expectedKey = `proration-reminder-${prorationId}`;

    const runs = [{ id: "run-uuid", idempotencyKey: expectedKey }];

    mocks.runsList.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const run of runs) {
          yield run;
        }
      },
    });
    mocks.runsCancel.mockResolvedValue({});

    await runFn({ prorationId });

    expect(mocks.runsCancel).toHaveBeenCalledTimes(1);
    expect(mocks.runsCancel).toHaveBeenCalledWith("run-uuid");
  });
});
