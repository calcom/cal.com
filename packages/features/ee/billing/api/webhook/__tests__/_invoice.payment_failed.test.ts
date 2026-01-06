import { beforeEach, describe, expect, it, vi } from "vitest";

import handler from "../_invoice.payment_failed";

vi.mock("../../../service/proration/MonthlyProrationService", () => ({
  MonthlyProrationService: class {
    handleProrationPaymentFailure = vi.fn().mockResolvedValue(undefined);
  },
}));

describe("invoice.payment_failed webhook handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process proration line items and mark as failed", async () => {
    const mockInvoice = {
      id: "in_test_123",
      customer: "cus_test_123",
      last_finalization_error: {
        message: "insufficient funds",
      },
      lines: {
        data: [
          {
            id: "il_test_1",
            metadata: {
              type: "monthly_proration",
              prorationId: "proration_123",
              teamId: "1",
              monthKey: "2026-01",
            },
          },
        ],
      },
    };

    const result = await handler({ object: mockInvoice } as any);

    expect(result).toEqual({ success: true });

    const { MonthlyProrationService } = await import("../../../service/proration/MonthlyProrationService");
    const instance = new MonthlyProrationService();
    expect(instance.handleProrationPaymentFailure).toHaveBeenCalledWith({
      prorationId: "proration_123",
      reason: "insufficient funds",
    });
  });

  it("should use default failure reason if error message not available", async () => {
    const mockInvoice = {
      id: "in_test_123",
      customer: "cus_test_123",
      lines: {
        data: [
          {
            id: "il_test_1",
            metadata: {
              type: "monthly_proration",
              prorationId: "proration_456",
            },
          },
        ],
      },
    };

    const result = await handler({ object: mockInvoice } as any);

    expect(result).toEqual({ success: true });

    const { MonthlyProrationService } = await import("../../../service/proration/MonthlyProrationService");
    const instance = new MonthlyProrationService();
    expect(instance.handleProrationPaymentFailure).toHaveBeenCalledWith({
      prorationId: "proration_456",
      reason: "payment failed",
    });
  });

  it("should return early if no proration line items found", async () => {
    const mockInvoice = {
      id: "in_test_123",
      customer: "cus_test_123",
      lines: {
        data: [
          {
            id: "il_test_1",
            metadata: {
              type: "subscription",
            },
          },
        ],
      },
    };

    const result = await handler({ object: mockInvoice } as any);

    expect(result).toEqual({ success: true, message: "no proration line items in invoice" });

    const { MonthlyProrationService } = await import("../../../service/proration/MonthlyProrationService");
    const instance = new MonthlyProrationService();
    expect(instance.handleProrationPaymentFailure).not.toHaveBeenCalled();
  });
});
