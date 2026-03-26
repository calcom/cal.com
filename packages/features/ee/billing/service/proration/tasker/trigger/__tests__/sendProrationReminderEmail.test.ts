import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so mock functions exist before vi.mock runs
const mocks = vi.hoisted(() => ({
  schemaTask: vi.fn((opts: any) => ({ ...opts, trigger: vi.fn(), batchTriggerAndWait: vi.fn() })),
  queue: vi.fn((opts: any) => opts),
  sendReminderEmail: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: mocks.schemaTask,
  queue: mocks.queue,
}));

vi.mock("../../../ProrationEmailService", () => ({
  ProrationEmailService: class MockProrationEmailService {
    sendReminderEmail = mocks.sendReminderEmail;
  },
}));

// Import module under test
await import("../sendProrationReminderEmail");

// Extract the run function
const taskConfig = mocks.schemaTask.mock.calls[0]?.[0];
const runFn = taskConfig?.run as (payload: { prorationId: string; teamId: number }) => Promise<any>;

describe("sendProrationReminderEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined with correct task id", () => {
    expect(taskConfig.id).toBe("billing.proration.send-reminder-email");
  });

  it("should call emailService.sendReminderEmail with payload and return success", async () => {
    mocks.sendReminderEmail.mockResolvedValue(undefined);

    const payload = {
      prorationId: "550e8400-e29b-41d4-a716-446655440000",
      teamId: 42,
    };

    const result = await runFn(payload);

    expect(mocks.sendReminderEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendReminderEmail).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  it("should handle different team IDs", async () => {
    mocks.sendReminderEmail.mockResolvedValue(undefined);

    const payload = {
      prorationId: "660e8400-e29b-41d4-a716-446655440001",
      teamId: 1,
    };

    const result = await runFn(payload);

    expect(mocks.sendReminderEmail).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  it("should propagate errors from emailService", async () => {
    mocks.sendReminderEmail.mockRejectedValue(new Error("Reminder email failed"));

    const payload = {
      prorationId: "770e8400-e29b-41d4-a716-446655440002",
      teamId: 5,
    };

    await expect(runFn(payload)).rejects.toThrow("Reminder email failed");
  });
});
