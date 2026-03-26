import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so the mock functions exist before vi.mock runs
const mocks = vi.hoisted(() => ({
  schemaTask: vi.fn((opts: any) => ({ ...opts, trigger: vi.fn(), batchTriggerAndWait: vi.fn() })),
  queue: vi.fn((opts: any) => opts),
  sendProrationInvoiceEmailTrigger: vi.fn().mockResolvedValue({}),
  sendProrationReminderEmailTrigger: vi.fn().mockResolvedValue({}),
  processMonthlyProrations: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({
  schemaTask: mocks.schemaTask,
  queue: mocks.queue,
}));

vi.mock("../sendProrationInvoiceEmail", () => ({
  sendProrationInvoiceEmail: {
    id: "billing.proration.send-invoice-email",
    trigger: mocks.sendProrationInvoiceEmailTrigger,
  },
}));

vi.mock("../sendProrationReminderEmail", () => ({
  sendProrationReminderEmail: {
    id: "billing.proration.send-reminder-email",
    trigger: mocks.sendProrationReminderEmailTrigger,
  },
}));

vi.mock("@calcom/features/ee/billing/di/containers/MonthlyProrationService", () => ({
  getMonthlyProrationService: () => ({
    processMonthlyProrations: mocks.processMonthlyProrations,
  }),
}));

// Import module under test - schemaTask is called during import
await import("../processMonthlyProrationBatch");

// Extract the run function that was passed to schemaTask
const taskConfig = mocks.schemaTask.mock.calls[0]?.[0];
const runFn = taskConfig?.run as (payload: { monthKey: string; teamIds: number[] }) => Promise<any>;

describe("processMonthlyProrationBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined with correct task id", () => {
    expect(taskConfig.id).toBe("billing.monthly-proration.batch");
  });

  it("should process prorations and trigger invoice emails for INVOICE_CREATED status", async () => {
    const prorationResults = [
      { id: "pror-1", teamId: 10, status: "INVOICE_CREATED" },
      { id: "pror-2", teamId: 20, status: "INVOICE_CREATED" },
    ];
    mocks.processMonthlyProrations.mockResolvedValue(prorationResults);

    const result = await runFn({ monthKey: "2026-02", teamIds: [10, 20] });

    expect(mocks.processMonthlyProrations).toHaveBeenCalledWith({
      monthKey: "2026-02",
      teamIds: [10, 20],
    });
    expect(result).toEqual(prorationResults);

    // Should trigger invoice email for each auto-charge proration
    expect(mocks.sendProrationInvoiceEmailTrigger).toHaveBeenCalledTimes(2);
    expect(mocks.sendProrationInvoiceEmailTrigger).toHaveBeenCalledWith({
      prorationId: "pror-1",
      teamId: 10,
      isAutoCharge: true,
    });
    expect(mocks.sendProrationInvoiceEmailTrigger).toHaveBeenCalledWith({
      prorationId: "pror-2",
      teamId: 20,
      isAutoCharge: true,
    });

    // Should NOT trigger reminder emails for auto-charge invoices
    expect(mocks.sendProrationReminderEmailTrigger).not.toHaveBeenCalled();
  });

  it("should trigger both invoice and reminder emails for PENDING status", async () => {
    const prorationResults = [{ id: "pror-3", teamId: 30, status: "PENDING" }];
    mocks.processMonthlyProrations.mockResolvedValue(prorationResults);

    const result = await runFn({ monthKey: "2026-03", teamIds: [30] });

    expect(result).toEqual(prorationResults);

    // Should trigger invoice email with isAutoCharge=false
    expect(mocks.sendProrationInvoiceEmailTrigger).toHaveBeenCalledTimes(1);
    expect(mocks.sendProrationInvoiceEmailTrigger).toHaveBeenCalledWith({
      prorationId: "pror-3",
      teamId: 30,
      isAutoCharge: false,
    });

    // Should trigger reminder email with delay and idempotency key
    expect(mocks.sendProrationReminderEmailTrigger).toHaveBeenCalledTimes(1);
    expect(mocks.sendProrationReminderEmailTrigger).toHaveBeenCalledWith(
      { prorationId: "pror-3", teamId: 30 },
      { delay: "7d", idempotencyKey: "proration-reminder-pror-3" }
    );
  });

  it("should skip prorations that are neither INVOICE_CREATED nor PENDING", async () => {
    const prorationResults = [
      { id: "pror-4", teamId: 40, status: "SKIPPED" },
      { id: "pror-5", teamId: 50, status: "ERROR" },
      { id: "pror-6", teamId: 60, status: "NO_CHANGE" },
    ];
    mocks.processMonthlyProrations.mockResolvedValue(prorationResults);

    const result = await runFn({ monthKey: "2026-01", teamIds: [40, 50, 60] });

    expect(result).toEqual(prorationResults);
    expect(mocks.sendProrationInvoiceEmailTrigger).not.toHaveBeenCalled();
    expect(mocks.sendProrationReminderEmailTrigger).not.toHaveBeenCalled();
  });

  it("should handle mixed statuses correctly", async () => {
    const prorationResults = [
      { id: "pror-a", teamId: 1, status: "INVOICE_CREATED" },
      { id: "pror-b", teamId: 2, status: "PENDING" },
      { id: "pror-c", teamId: 3, status: "SKIPPED" },
    ];
    mocks.processMonthlyProrations.mockResolvedValue(prorationResults);

    await runFn({ monthKey: "2026-04", teamIds: [1, 2, 3] });

    // 2 invoice emails (INVOICE_CREATED + PENDING)
    expect(mocks.sendProrationInvoiceEmailTrigger).toHaveBeenCalledTimes(2);

    // 1 reminder email (only PENDING)
    expect(mocks.sendProrationReminderEmailTrigger).toHaveBeenCalledTimes(1);
    expect(mocks.sendProrationReminderEmailTrigger).toHaveBeenCalledWith(
      { prorationId: "pror-b", teamId: 2 },
      { delay: "7d", idempotencyKey: "proration-reminder-pror-b" }
    );
  });

  it("should handle empty proration results", async () => {
    mocks.processMonthlyProrations.mockResolvedValue([]);

    const result = await runFn({ monthKey: "2026-05", teamIds: [100] });

    expect(result).toEqual([]);
    expect(mocks.sendProrationInvoiceEmailTrigger).not.toHaveBeenCalled();
    expect(mocks.sendProrationReminderEmailTrigger).not.toHaveBeenCalled();
  });
});
