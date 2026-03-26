import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so mock functions exist before vi.mock runs
const mocks = vi.hoisted(() => ({
  schemaTask: vi.fn((opts: any) => ({ ...opts, trigger: vi.fn(), batchTriggerAndWait: vi.fn() })),
  queue: vi.fn((opts: any) => opts),
  sendInvoiceEmail: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: mocks.schemaTask,
  queue: mocks.queue,
}));

vi.mock("../../../ProrationEmailService", () => ({
  ProrationEmailService: class MockProrationEmailService {
    sendInvoiceEmail = mocks.sendInvoiceEmail;
  },
}));

// Import module under test
await import("../sendProrationInvoiceEmail");

// Extract the run function
const taskConfig = mocks.schemaTask.mock.calls[0]?.[0];
const runFn = taskConfig?.run as (payload: {
  prorationId: string;
  teamId: number;
  isAutoCharge: boolean;
}) => Promise<any>;

describe("sendProrationInvoiceEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined with correct task id", () => {
    expect(taskConfig.id).toBe("billing.proration.send-invoice-email");
  });

  it("should call emailService.sendInvoiceEmail with payload and return success", async () => {
    mocks.sendInvoiceEmail.mockResolvedValue(undefined);

    const payload = {
      prorationId: "550e8400-e29b-41d4-a716-446655440000",
      teamId: 42,
      isAutoCharge: true,
    };

    const result = await runFn(payload);

    expect(mocks.sendInvoiceEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendInvoiceEmail).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  it("should call emailService.sendInvoiceEmail with isAutoCharge false", async () => {
    mocks.sendInvoiceEmail.mockResolvedValue(undefined);

    const payload = {
      prorationId: "660e8400-e29b-41d4-a716-446655440001",
      teamId: 99,
      isAutoCharge: false,
    };

    const result = await runFn(payload);

    expect(mocks.sendInvoiceEmail).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  it("should propagate errors from emailService", async () => {
    mocks.sendInvoiceEmail.mockRejectedValue(new Error("Email sending failed"));

    const payload = {
      prorationId: "770e8400-e29b-41d4-a716-446655440002",
      teamId: 5,
      isAutoCharge: true,
    };

    await expect(runFn(payload)).rejects.toThrow("Email sending failed");
  });
});
