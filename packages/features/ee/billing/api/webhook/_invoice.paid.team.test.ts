import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";

const onRenewalPaid = vi.fn().mockResolvedValue({});
const createBySubscriptionId = vi.fn().mockResolvedValue({ onRenewalPaid });

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningStrategyFactory: () => ({ createBySubscriptionId }),
}));

import handler from "./_invoice.paid.team";

type InvoicePaidData = SWHMap["invoice.paid"]["data"];

function buildInvoiceData(overrides: {
  subscription_item?: string | null;
  billing_reason?: string | null;
  period?: { start: number; end: number };
}): InvoicePaidData {
  return {
    object: {
      customer: "cus_123",
      subscription: "sub_123",
      billing_reason: overrides.billing_reason ?? "subscription_create",
      lines: {
        data: [
          {
            subscription_item: overrides.subscription_item ?? "si_123",
            period: overrides.period ?? { start: 1700000000, end: 1703000000 },
          },
        ],
      },
    },
  } as unknown as InvoicePaidData;
}

describe("invoice.paid.team webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("schema validation with nullable subscription_item", () => {
    it("parses invoice with null subscription_item (trial invoice)", async () => {
      const data = buildInvoiceData({
        subscription_item: null,
        billing_reason: "subscription_create",
      });

      const result = await handler(data);

      expect(result).toEqual({ success: true });
    });

    it("parses invoice with valid subscription_item", async () => {
      const data = buildInvoiceData({
        subscription_item: "si_123",
        billing_reason: "subscription_create",
      });

      const result = await handler(data);

      expect(result).toEqual({ success: true });
    });
  });

  describe("renewal handling", () => {
    it("processes renewal with null subscription_item", async () => {
      const data = buildInvoiceData({
        subscription_item: null,
        billing_reason: "subscription_cycle",
        period: { start: 1700000000, end: 1703000000 },
      });

      const result = await handler(data);

      expect(createBySubscriptionId).toHaveBeenCalledWith("sub_123");
      expect(onRenewalPaid).toHaveBeenCalledWith("sub_123", new Date(1700000000 * 1000));
      expect(result).toEqual({ success: true });
    });

    it("skips renewal when period start is missing", async () => {
      const data = {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          billing_reason: "subscription_cycle",
          lines: {
            data: [{ subscription_item: null }],
          },
        },
      } as unknown as InvoicePaidData;

      const result = await handler(data);

      expect(createBySubscriptionId).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("non-renewal invoices", () => {
    it("skips processing for subscription_create billing reason", async () => {
      const data = buildInvoiceData({
        billing_reason: "subscription_create",
      });

      const result = await handler(data);

      expect(createBySubscriptionId).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});
