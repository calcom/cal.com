import { beforeEach, describe, expect, it, vi } from "vitest";

import handler from "../_invoice.payment_succeeded";

vi.mock("../../../service/proration/MonthlyProrationService", () => ({
  MonthlyProrationService: class {
    handleProrationPaymentSuccess = vi.fn().mockResolvedValue(undefined);
  },
}));

describe("invoice.payment_succeeded webhook handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process proration line items and mark as charged", async () => {
    const mockInvoice = {
      id: "in_test_123",
      customer: "cus_test_123",
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
          {
            id: "il_test_2",
            metadata: {
              type: "other",
            },
          },
        ],
      },
    };

    const result = await handler({ object: mockInvoice } as any);

    expect(result).toEqual({ success: true });

    const { MonthlyProrationService } = await import("../../../service/proration/MonthlyProrationService");
    const instance = new MonthlyProrationService();
    expect(instance.handleProrationPaymentSuccess).toHaveBeenCalledWith("proration_123");
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
    expect(instance.handleProrationPaymentSuccess).not.toHaveBeenCalled();
  });

  it("should handle missing prorationId in metadata", async () => {
    const mockInvoice = {
      id: "in_test_123",
      customer: "cus_test_123",
      lines: {
        data: [
          {
            id: "il_test_1",
            metadata: {
              type: "monthly_proration",
            },
          },
        ],
      },
    };

    const result = await handler({ object: mockInvoice } as any);

    expect(result).toEqual({ success: false, message: "missing prorationId in metadata" });
  });
});
