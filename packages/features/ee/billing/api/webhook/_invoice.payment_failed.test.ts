import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMonthlyProrationMetadata } from "../../lib/proration-utils";
import type { SWHMap } from "./__handler";
import handler from "./_invoice.payment_failed";

const handleProrationPaymentFailure = vi.fn();
const getPaymentIntentFailureReason = vi.fn().mockResolvedValue("card_declined");

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: () => ({
    getPaymentIntentFailureReason,
  }),
}));

vi.mock("../../service/proration/MonthlyProrationService", () => ({
  MonthlyProrationService: class {
    handleProrationPaymentFailure = handleProrationPaymentFailure;
  },
}));

describe("invoice.payment_failed webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records proration failure with payment intent reason", async () => {
    const data = {
      object: {
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
    expect(handleProrationPaymentFailure).toHaveBeenCalledWith({
      prorationId: "pr_123",
      reason: "card_declined",
    });
    expect(result).toEqual({ success: true });
  });
});
