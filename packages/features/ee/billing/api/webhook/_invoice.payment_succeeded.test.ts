import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMonthlyProrationMetadata } from "../../lib/proration-utils";
import type { SWHMap } from "./__handler";
import handler from "./_invoice.payment_succeeded";

const handleProrationPaymentSuccess = vi.fn();

vi.mock("../../service/proration/MonthlyProrationService", () => ({
  MonthlyProrationService: class {
    handleProrationPaymentSuccess = handleProrationPaymentSuccess;
  },
}));

describe("invoice.payment_succeeded webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks proration as charged when line item is present", async () => {
    const data = {
      object: {
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

    expect(handleProrationPaymentSuccess).toHaveBeenCalledWith("pr_123");
    expect(result).toEqual({ success: true });
  });

  it("skips when no proration line item exists", async () => {
    const data = {
      object: {
        lines: {
          data: [
            {
              metadata: {
                type: "other",
              },
            },
          ],
        },
      },
    } as unknown as SWHMap["invoice.payment_succeeded"]["data"];

    const result = await handler(data);

    expect(handleProrationPaymentSuccess).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: "no proration line items in invoice" });
  });
});
