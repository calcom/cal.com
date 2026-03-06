import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";

const { customersUpdate, listLineItems, upsertUserBalance, upsertTeamBalance, createCreditPurchaseLog } =
  vi.hoisted(() => ({
    customersUpdate: vi.fn().mockResolvedValue({}),
    listLineItems: vi.fn().mockResolvedValue({
      data: [{ price: { id: "price_credits" }, quantity: 10 }],
    }),
    upsertUserBalance: vi.fn().mockResolvedValue({ id: "cb_1" }),
    upsertTeamBalance: vi.fn().mockResolvedValue({ id: "cb_1" }),
    createCreditPurchaseLog: vi.fn().mockResolvedValue({}),
  }));

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    customers: { update: customersUpdate },
    checkout: { sessions: { listLineItems } },
  },
}));

vi.mock("@calcom/features/di/containers/CreditsRepository", () => ({
  getCreditsRepository: () => ({
    upsertUserBalance,
    upsertTeamBalance,
    createCreditPurchaseLog,
  }),
}));

vi.mock("@calcom/features/calAIPhone", () => ({
  createDefaultAIPhoneServiceProvider: vi.fn(),
}));
vi.mock("@calcom/features/calAIPhone/repositories/PrismaAgentRepository", () => ({
  PrismaAgentRepository: vi.fn(),
}));
vi.mock("@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository", () => ({
  PrismaPhoneNumberRepository: vi.fn(),
}));
vi.mock("@calcom/prisma", () => ({ prisma: {} }));

import handler from "./_checkout.session.completed";

function buildSession(
  overrides: Partial<SWHMap["checkout.session.completed"]["data"]["object"]> = {}
) {
  return {
    object: {
      id: "cs_123",
      mode: "payment" as const,
      amount_total: 5000,
      customer: "cus_123",
      subscription: null,
      metadata: { type: "credit_purchase", userId: "1" },
      ...overrides,
    },
  } as unknown as SWHMap["checkout.session.completed"]["data"];
}

describe("checkout.session.completed webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID = "price_credits";
  });

  describe("subscription mode sessions", () => {
    it("skips org subscription checkout (handled via invoice.paid)", async () => {
      const data = buildSession({
        mode: "subscription",
        metadata: { organizationOnboardingId: "onb_123" },
      });

      const result = await handler(data);

      expect(result).toEqual({
        success: true,
        message: "Subscription checkout handled via invoice.paid",
      });
      expect(listLineItems).not.toHaveBeenCalled();
      expect(upsertUserBalance).not.toHaveBeenCalled();
      expect(upsertTeamBalance).not.toHaveBeenCalled();
    });

    it("skips legacy team/org subscription checkout with teamId (handled via invoice.paid)", async () => {
      const data = buildSession({
        mode: "subscription",
        amount_total: 0,
        metadata: { teamId: "42" },
      });

      const result = await handler(data);

      expect(result).toEqual({
        success: true,
        message: "Subscription checkout handled via invoice.paid",
      });
      expect(listLineItems).not.toHaveBeenCalled();
    });

    it("skips subscription checkout with no metadata (handled via invoice.paid)", async () => {
      const data = buildSession({
        mode: "subscription",
        metadata: {},
      });

      const result = await handler(data);

      expect(result).toEqual({
        success: true,
        message: "Subscription checkout handled via invoice.paid",
      });
    });
  });

  describe("credit purchases (payment mode)", () => {
    it("processes a valid credit purchase", async () => {
      const data = buildSession({
        mode: "payment",
        amount_total: 5000,
        metadata: { type: "credit_purchase", userId: "1" },
      });

      const result = await handler(data);

      expect(listLineItems).toHaveBeenCalledWith("cs_123");
      expect(upsertUserBalance).toHaveBeenCalledWith({
        userId: 1,
        additionalCredits: 10,
      });
      expect(createCreditPurchaseLog).toHaveBeenCalledWith({
        credits: 10,
        creditBalanceId: "cb_1",
      });
      expect(result).toEqual({ success: true });
    });

    it("throws when payment mode session has no amount_total", async () => {
      const data = buildSession({
        mode: "payment",
        amount_total: 0,
        metadata: { type: "credit_purchase", userId: "1" },
      });

      await expect(handler(data)).rejects.toThrow("Missing required payment details");
    });
  });

  describe("unrecognized metadata type", () => {
    it("returns failure for unknown metadata type", async () => {
      const data = buildSession({
        mode: "payment",
        metadata: { type: "unknown_type", userId: "1" },
      });

      const result = await handler(data);

      expect(result).toEqual({
        success: false,
        message: "Unhandled metadata type: unknown_type",
      });
      expect(listLineItems).not.toHaveBeenCalled();
    });
  });

  describe("legacy credit purchase fallback (no metadata type)", () => {
    it("falls back to credits handler for payment-mode sessions without metadata type", async () => {
      const data = buildSession({
        mode: "payment",
        amount_total: 5000,
        metadata: { userId: "1" },
      });

      const result = await handler(data);

      expect(listLineItems).toHaveBeenCalledWith("cs_123");
      expect(upsertUserBalance).toHaveBeenCalledWith({
        userId: 1,
        additionalCredits: 10,
      });
      expect(result).toEqual({ success: true });
    });

    it("does not fall back for subscription-mode sessions without metadata type", async () => {
      const data = buildSession({
        mode: "subscription",
        metadata: {},
      });

      const result = await handler(data);

      expect(result).toEqual({
        success: true,
        message: "Subscription checkout handled via invoice.paid",
      });
      expect(listLineItems).not.toHaveBeenCalled();
    });
  });

  describe("ad tracking metadata", () => {
    it("updates Stripe customer with tracking metadata", async () => {
      const data = buildSession({
        mode: "payment",
        amount_total: 5000,
        customer: "cus_track",
        metadata: { type: "credit_purchase", userId: "1", gclid: "gclid_123", campaignId: "camp_123" },
      });

      await handler(data);

      expect(customersUpdate).toHaveBeenCalledWith("cus_track", {
        metadata: { gclid: "gclid_123", campaignId: "camp_123" },
      });
    });
  });
});
