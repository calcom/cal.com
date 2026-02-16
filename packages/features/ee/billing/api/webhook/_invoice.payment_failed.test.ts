import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMonthlyProrationMetadata } from "../../lib/proration-utils";
import type { SWHMap } from "./__handler";
import handler from "./_invoice.payment_failed";

const onPaymentFailed = vi.fn().mockResolvedValue({ handled: true });
const createBySubscriptionId = vi.fn().mockResolvedValue({ onPaymentFailed });
const getPaymentIntentFailureReason = vi.fn().mockResolvedValue("card_declined");

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: () => ({
    getPaymentIntentFailureReason,
  }),
  getSeatBillingStrategyFactory: () => ({ createBySubscriptionId }),
}));

describe("invoice.payment_failed webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records proration failure with payment intent reason", async () => {
    const data = {
      object: {
        subscription: "sub_123",
        payment_intent: "pi_123",
        status: "open",
        lines: {
          data: [
            {
              metadata: buildMonthlyProrationMetadata({ prorationId: "pr_123" }),
            },
          ],
        },
      },
    } as unknown as SWHMap["invoice.payment_failed"]["data"];

    const result = await handler(data);

    expect(getPaymentIntentFailureReason).toHaveBeenCalledWith("pi_123");
    expect(createBySubscriptionId).toHaveBeenCalledWith("sub_123");
    expect(onPaymentFailed).toHaveBeenCalledWith({ lines: data.object.lines }, "card_declined");
    expect(result).toEqual({ success: true, handled: true });
  });

  it("skips when no subscription on invoice", async () => {
    const data = {
      object: {
        subscription: null,
        payment_intent: "pi_123",
        status: "open",
        lines: { data: [] },
      },
    } as unknown as SWHMap["invoice.payment_failed"]["data"];

    const result = await handler(data);

    expect(createBySubscriptionId).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: "not a subscription invoice" });
  });

  it("uses invoice status as fallback when no payment intent", async () => {
    const data = {
      object: {
        subscription: "sub_456",
        payment_intent: null,
        status: "open",
        lines: {
          data: [
            {
              metadata: buildMonthlyProrationMetadata({ prorationId: "pr_456" }),
            },
          ],
        },
      },
    } as unknown as SWHMap["invoice.payment_failed"]["data"];

    const result = await handler(data);

    expect(getPaymentIntentFailureReason).not.toHaveBeenCalled();
    expect(onPaymentFailed).toHaveBeenCalledWith({ lines: data.object.lines }, "open");
    expect(result).toEqual({ success: true, handled: true });
  });
});
