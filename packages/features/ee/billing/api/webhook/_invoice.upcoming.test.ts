import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";
import handler from "./_invoice.upcoming";

const onInvoiceUpcoming = vi.fn().mockResolvedValue({ applied: true });
const createBySubscriptionId = vi.fn().mockResolvedValue({
  onInvoiceUpcoming,
  strategyName: "test-strategy",
});

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningStrategyFactory: () => ({ createBySubscriptionId }),
}));

describe("invoice.upcoming webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when no subscription on invoice", async () => {
    const data = {
      object: {
        id: "in_789",
        subscription: null,
        customer: "cus_789",
      },
    } as unknown as SWHMap["invoice.upcoming"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).not.toHaveBeenCalled();
    expect(onInvoiceUpcoming).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: "Not a subscription invoice" });
  });

  it("handles subscription as string - happy path", async () => {
    const data = {
      object: {
        id: "in_123",
        subscription: "sub_123",
        customer: "cus_123",
      },
    } as unknown as SWHMap["invoice.upcoming"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).toHaveBeenCalledWith("sub_123");
    expect(onInvoiceUpcoming).toHaveBeenCalledWith("sub_123");
    expect(result).toEqual({ success: true, strategyApplied: true });
  });

  it("handles subscription as object with .id - happy path", async () => {
    const data = {
      object: {
        id: "in_456",
        subscription: { id: "sub_456" },
        customer: "cus_456",
      },
    } as unknown as SWHMap["invoice.upcoming"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).toHaveBeenCalledWith("sub_456");
    expect(onInvoiceUpcoming).toHaveBeenCalledWith("sub_456");
    expect(result).toEqual({ success: true, strategyApplied: true });
  });

  it("returns strategyApplied value from strategy response", async () => {
    onInvoiceUpcoming.mockResolvedValueOnce({ applied: false });

    const data = {
      object: {
        id: "in_not_applied",
        subscription: "sub_not_applied",
        customer: "cus_not_applied",
      },
    } as unknown as SWHMap["invoice.upcoming"]["data"];

    const result = await handler(data);

    expect(result).toEqual({ success: true, strategyApplied: false });
  });

  it("handles error from dunning strategy factory", async () => {
    const error = new Error("Strategy creation failed");
    createBySubscriptionId.mockRejectedValueOnce(error);

    const data = {
      object: {
        id: "in_error",
        subscription: "sub_error",
        customer: "cus_error",
      },
    } as unknown as SWHMap["invoice.upcoming"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).toHaveBeenCalledWith("sub_error");
    expect(result).toEqual({ success: false, error: "Error: Strategy creation failed" });
  });

  it("handles error from onInvoiceUpcoming method", async () => {
    const error = new Error("Upcoming processing failed");
    onInvoiceUpcoming.mockRejectedValueOnce(error);

    const data = {
      object: {
        id: "in_error2",
        subscription: "sub_error2",
        customer: "cus_error2",
      },
    } as unknown as SWHMap["invoice.upcoming"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).toHaveBeenCalledWith("sub_error2");
    expect(onInvoiceUpcoming).toHaveBeenCalledWith("sub_error2");
    expect(result).toEqual({ success: false, error: "Error: Upcoming processing failed" });
  });
});
