import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMonthlyProrationMetadata } from "../../lib/proration-utils";
import type { SWHMap } from "./__handler";
import handler from "./_invoice.payment_succeeded";

const onPaymentSucceeded = vi.fn().mockResolvedValue({ handled: true });
const createBySubscriptionId = vi.fn().mockResolvedValue({ onPaymentSucceeded });

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getSeatBillingStrategyFactory: () => ({ createBySubscriptionId }),
}));

describe("invoice.payment_succeeded webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks proration as charged when line item is present", async () => {
    const data = {
      object: {
        subscription: "sub_123",
        lines: {
          data: [
            {
              metadata: buildMonthlyProrationMetadata({ prorationId: "pr_123" }),
            },
          ],
        },
      },
    } as unknown as SWHMap["invoice.payment_succeeded"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).toHaveBeenCalledWith("sub_123");
    expect(onPaymentSucceeded).toHaveBeenCalledWith({
      lines: data.object.lines,
    });
    expect(result).toEqual({ success: true, handled: true });
  });

  it("skips when no subscription on invoice", async () => {
    const data = {
      object: {
        subscription: null,
        lines: {
          data: [
            {
              metadata: { type: "other" },
            },
          ],
        },
      },
    } as unknown as SWHMap["invoice.payment_succeeded"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: "not a subscription invoice" });
  });

  it("returns handled=false when strategy does not handle the invoice", async () => {
    onPaymentSucceeded.mockResolvedValueOnce({ handled: false });

    const data = {
      object: {
        subscription: "sub_456",
        lines: {
          data: [{ metadata: { type: "other" } }],
        },
      },
    } as unknown as SWHMap["invoice.payment_succeeded"]["data"];

    const result = await handler(data);

    expect(result).toEqual({ success: true, handled: false });
  });
});
