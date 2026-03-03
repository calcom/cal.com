import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ISeatBillingStrategy, StripeInvoiceData } from "../seatBillingStrategy/ISeatBillingStrategy";
import { DunningAwareStrategy } from "./DunningAwareStrategy";
import type { IDunningService } from "./IDunningService";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

function createMockInner(): { [K in keyof ISeatBillingStrategy]: ReturnType<typeof vi.fn> } {
  return {
    onSeatChange: vi.fn().mockResolvedValue(undefined),
    onInvoiceUpcoming: vi.fn().mockResolvedValue({ applied: false }),
    onRenewalPaid: vi.fn().mockResolvedValue({ reset: false }),
    onPaymentSucceeded: vi.fn().mockResolvedValue({ handled: true }),
    onPaymentFailed: vi.fn().mockResolvedValue({ handled: true }),
  };
}

function createMockDunningService(): {
  onPaymentFailed: ReturnType<typeof vi.fn>;
  onPaymentSucceeded: ReturnType<typeof vi.fn>;
  findRecord: ReturnType<typeof vi.fn>;
  getStatus: ReturnType<typeof vi.fn>;
  getBillingIdsToAdvance: ReturnType<typeof vi.fn>;
  advanceDunning: ReturnType<typeof vi.fn>;
} {
  return {
    onPaymentFailed: vi.fn().mockResolvedValue({ isNewDunningRecord: false }),
    onPaymentSucceeded: vi.fn().mockResolvedValue(undefined),
    findRecord: vi.fn().mockResolvedValue(null),
    getStatus: vi.fn().mockResolvedValue("CURRENT"),
    getBillingIdsToAdvance: vi.fn().mockResolvedValue([]),
    advanceDunning: vi.fn().mockResolvedValue({ advanced: false }),
  };
}

const TEAM_ID = 42;
const BILLING_ID = "billing_test_123";
const SUBSCRIPTION_ID = "sub_test_123";

const sampleInvoice: StripeInvoiceData = {
  id: "in_test_123",
  hosted_invoice_url: "https://invoice.stripe.com/i/test_123",
  lines: {
    data: [
      {
        metadata: { teamId: "42" },
      },
    ],
  },
};

describe("DunningAwareStrategy", () => {
  let strategy: DunningAwareStrategy;
  let mockInner: ReturnType<typeof createMockInner>;
  let mockDunningService: ReturnType<typeof createMockDunningService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInner = createMockInner();
    mockDunningService = createMockDunningService();
    strategy = new DunningAwareStrategy({
      inner: mockInner as unknown as ISeatBillingStrategy,
      dunningService: mockDunningService as unknown as IDunningService,
      billingId: BILLING_ID,
      teamId: TEAM_ID,
      subscriptionId: SUBSCRIPTION_ID,
    });
  });

  describe("onSeatChange", () => {
    it("delegates directly to inner strategy", async () => {
      const context = {
        teamId: TEAM_ID,
        subscriptionId: SUBSCRIPTION_ID,
        subscriptionItemId: "si_abc",
        membershipCount: 5,
        changeType: "addition" as const,
      };

      await strategy.onSeatChange(context);

      expect(mockInner.onSeatChange).toHaveBeenCalledWith(context);
      expect(mockInner.onSeatChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("onInvoiceUpcoming", () => {
    it("delegates directly to inner strategy", async () => {
      const result = await strategy.onInvoiceUpcoming(SUBSCRIPTION_ID);

      expect(mockInner.onInvoiceUpcoming).toHaveBeenCalledWith(SUBSCRIPTION_ID);
      expect(result).toEqual({ applied: false });
    });
  });

  describe("onRenewalPaid", () => {
    it("delegates directly to inner strategy", async () => {
      const periodStart = new Date("2026-03-01T00:00:00Z");

      const result = await strategy.onRenewalPaid(SUBSCRIPTION_ID, periodStart);

      expect(mockInner.onRenewalPaid).toHaveBeenCalledWith(SUBSCRIPTION_ID, periodStart);
      expect(result).toEqual({ reset: false });
    });
  });

  describe("onPaymentFailed", () => {
    it("calls dunningService.onPaymentFailed with billingId then delegates to inner", async () => {
      const reason = "card_declined";

      const result = await strategy.onPaymentFailed(sampleInvoice, reason);

      expect(mockDunningService.onPaymentFailed).toHaveBeenCalledWith({
        billingId: BILLING_ID,
        subscriptionId: SUBSCRIPTION_ID,
        failedInvoiceId: "in_test_123",
        invoiceUrl: "https://invoice.stripe.com/i/test_123",
        failureReason: reason,
      });
      expect(mockInner.onPaymentFailed).toHaveBeenCalledWith(sampleInvoice, reason);
      expect(result).toEqual({ handled: true });
    });

    it("calls dunningService before inner strategy", async () => {
      const callOrder: string[] = [];
      mockDunningService.onPaymentFailed.mockImplementation(async () => {
        callOrder.push("dunning");
        return { isNewDunningRecord: false };
      });
      mockInner.onPaymentFailed.mockImplementation(async () => {
        callOrder.push("inner");
        return { handled: true };
      });

      await strategy.onPaymentFailed(sampleInvoice, "card_declined");

      expect(callOrder).toEqual(["dunning", "inner"]);
    });

    it("still delegates to inner even if dunningService throws", async () => {
      mockDunningService.onPaymentFailed.mockRejectedValue(new Error("DB connection lost"));

      const result = await strategy.onPaymentFailed(sampleInvoice, "card_declined");

      expect(mockInner.onPaymentFailed).toHaveBeenCalledWith(sampleInvoice, "card_declined");
      expect(result).toEqual({ handled: true });
    });

    it("does not swallow errors from inner strategy", async () => {
      mockInner.onPaymentFailed.mockRejectedValue(new Error("Inner strategy error"));

      await expect(strategy.onPaymentFailed(sampleInvoice, "card_declined")).rejects.toThrow(
        "Inner strategy error"
      );
    });

  });

  describe("onPaymentSucceeded", () => {
    it("calls dunningService.onPaymentSucceeded with billingId then delegates to inner", async () => {
      const result = await strategy.onPaymentSucceeded(sampleInvoice);

      expect(mockDunningService.onPaymentSucceeded).toHaveBeenCalledWith(BILLING_ID);
      expect(mockInner.onPaymentSucceeded).toHaveBeenCalledWith(sampleInvoice);
      expect(result).toEqual({ handled: true });
    });

    it("calls dunningService before inner strategy", async () => {
      const callOrder: string[] = [];
      mockDunningService.onPaymentSucceeded.mockImplementation(async () => {
        callOrder.push("dunning");
      });
      mockInner.onPaymentSucceeded.mockImplementation(async () => {
        callOrder.push("inner");
        return { handled: true };
      });

      await strategy.onPaymentSucceeded(sampleInvoice);

      expect(callOrder).toEqual(["dunning", "inner"]);
    });

    it("still delegates to inner even if dunningService throws", async () => {
      mockDunningService.onPaymentSucceeded.mockRejectedValue(new Error("DB connection lost"));

      const result = await strategy.onPaymentSucceeded(sampleInvoice);

      expect(mockInner.onPaymentSucceeded).toHaveBeenCalledWith(sampleInvoice);
      expect(result).toEqual({ handled: true });
    });

    it("does not swallow errors from inner strategy", async () => {
      mockInner.onPaymentSucceeded.mockRejectedValue(new Error("Inner strategy error"));

      await expect(strategy.onPaymentSucceeded(sampleInvoice)).rejects.toThrow("Inner strategy error");
    });
  });
});
