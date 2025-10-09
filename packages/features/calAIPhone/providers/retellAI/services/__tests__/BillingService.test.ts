import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CHECKOUT_SESSION_TYPES } from "@calcom/features/ee/billing/constants";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { BillingService } from "../BillingService";
import { setupBasicMocks, createMockPhoneNumberRecord, TestError } from "./test-utils";

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
  IS_PRODUCTION: false,
}));

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: "https://checkout.stripe.com/session-123",
        }),
      },
    },
    subscriptions: {
      cancel: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@calcom/app-store/stripepayment/lib/customer", () => ({
  getStripeCustomerIdFromUserId: vi.fn().mockResolvedValue("cus_123"),
}));

vi.mock("@calcom/app-store/stripepayment/lib/utils", () => ({
  getPhoneNumberMonthlyPriceId: vi.fn().mockReturnValue("price_123"),
}));

describe("BillingService", () => {
  let service: BillingService;
  let mocks: ReturnType<typeof setupBasicMocks>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks = setupBasicMocks();

    const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
    stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/session-123",
    });
    stripe.subscriptions.cancel.mockResolvedValue({});

    service = new BillingService({
      phoneNumberRepository: mocks.mockPhoneNumberRepository,
      retellRepository: mocks.mockRetellRepository,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePhoneNumberCheckoutSession", () => {
    const validCheckoutData = {
      userId: 1,
      workflowId: "workflow-123",
    };

    it("should create successful checkout session", async () => {
      const result = await service.generatePhoneNumberCheckoutSession(validCheckoutData);

      expect(result).toEqual({
        url: "https://checkout.stripe.com/session-123",
        message: "Payment required to purchase phone number",
      });

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          success_url:
            "https://app.cal.com/api/calAIPhone/subscription/success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "https://app.cal.com/workflows/workflow-123",
          metadata: expect.objectContaining({
            userId: "1",
            workflowId: "workflow-123",
            type: CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION,
          }),
        })
      );
    });

    it("should handle team billing", async () => {
      await service.generatePhoneNumberCheckoutSession({
        ...validCheckoutData,
        teamId: 5,
        agentId: "agent-123",
      });

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: "1",
            teamId: "5",
            agentId: "agent-123",
            workflowId: "workflow-123",
          }),
        })
      );
    });

    it("should throw error if checkout session creation fails", async () => {
      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      stripe.checkout.sessions.create.mockResolvedValue({ url: null });

      await expect(service.generatePhoneNumberCheckoutSession(validCheckoutData)).rejects.toThrow(
        "Failed to create checkout session"
      );
    });

    it("should throw error if price ID not configured", async () => {
      const { getPhoneNumberMonthlyPriceId } = await import("@calcom/app-store/stripepayment/lib/utils");
      vi.mocked(getPhoneNumberMonthlyPriceId).mockReturnValue(null);

      await expect(service.generatePhoneNumberCheckoutSession(validCheckoutData)).rejects.toThrow(
        "Phone number price ID not configured"
      );
    });

    it("should throw error if customer creation fails", async () => {
      const { getPhoneNumberMonthlyPriceId } = await import("@calcom/app-store/stripepayment/lib/utils");
      vi.mocked(getPhoneNumberMonthlyPriceId).mockReturnValue("price_123");

      const { getStripeCustomerIdFromUserId } = await import("@calcom/app-store/stripepayment/lib/customer");
      vi.mocked(getStripeCustomerIdFromUserId).mockResolvedValue(null);

      await expect(service.generatePhoneNumberCheckoutSession(validCheckoutData)).rejects.toThrow(
        "Failed to create Stripe customer"
      );
    });
  });

  describe("cancelPhoneNumberSubscription", () => {
    const validCancelData = {
      phoneNumberId: 1,
      userId: 1,
    };

    it("should successfully cancel subscription", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        id: 1,
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      });

      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(mockPhoneNumber);
      mocks.mockPhoneNumberRepository.updateSubscriptionStatus.mockResolvedValue(undefined);
      mocks.mockRetellRepository.deletePhoneNumber.mockResolvedValue(undefined);

      const result = await service.cancelPhoneNumberSubscription(validCancelData);

      expect(result).toEqual({
        success: true,
        message: "Phone number subscription cancelled successfully.",
      });

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_123");
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenCalledTimes(2);
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenNthCalledWith(1, {
        id: 1,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectAgents: false,
      });
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenNthCalledWith(2, {
        id: 1,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectAgents: true,
      });
      expect(mocks.mockRetellRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });

    it("should handle team-scoped cancellation", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        stripeSubscriptionId: "sub_123",
      });

      mocks.mockPhoneNumberRepository.findByIdWithTeamAccess.mockResolvedValue(mockPhoneNumber);

      await service.cancelPhoneNumberSubscription({
        ...validCancelData,
        teamId: 5,
      });

      expect(mocks.mockPhoneNumberRepository.findByIdWithTeamAccess).toHaveBeenCalledWith({
        id: 1,
        teamId: 5,
        userId: 1,
      });
    });

    it("should throw error if phone number not found", async () => {
      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.cancelPhoneNumberSubscription(validCancelData)).rejects.toThrow(
        "Phone number not found or you don't have permission to cancel it"
      );
    });

    it("should throw error if no active subscription", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        stripeSubscriptionId: null,
      });

      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(mockPhoneNumber);

      await expect(service.cancelPhoneNumberSubscription(validCancelData)).rejects.toThrow(
        "Phone number doesn't have an active subscription"
      );
    });

    it("should handle Stripe cancellation failure", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        stripeSubscriptionId: "sub_123",
      });

      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(mockPhoneNumber);
      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      stripe.subscriptions.cancel.mockRejectedValue(new TestError("Stripe API error"));

      await expect(service.cancelPhoneNumberSubscription(validCancelData)).rejects.toThrow(
        "Failed to cancel subscription"
      );
    });

    it("should handle Retell deletion failure gracefully", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        stripeSubscriptionId: "sub_123",
      });

      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(mockPhoneNumber);
      mocks.mockPhoneNumberRepository.updateSubscriptionStatus.mockResolvedValue(undefined);
      mocks.mockRetellRepository.deletePhoneNumber.mockRejectedValue(new TestError("Retell API error"));

      const result = await service.cancelPhoneNumberSubscription(validCancelData);

      expect(result.success).toBe(true);
      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      expect(stripe.subscriptions.cancel).toHaveBeenCalled();
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenCalled();
    });

    it("should handle database update failure", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        stripeSubscriptionId: "sub_123",
      });

      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(mockPhoneNumber);
      mocks.mockPhoneNumberRepository.updateSubscriptionStatus.mockRejectedValue(
        new TestError("Database error")
      );

      await expect(service.cancelPhoneNumberSubscription(validCancelData)).rejects.toThrow(
        "Failed to cancel subscription"
      );
    });

    it("should handle subscription not found (404) gracefully", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        id: 1,
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      });

      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(mockPhoneNumber);
      mocks.mockPhoneNumberRepository.updateSubscriptionStatus.mockResolvedValue(undefined);
      mocks.mockRetellRepository.deletePhoneNumber.mockResolvedValue(undefined);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      stripe.subscriptions.cancel.mockRejectedValue({
        type: "StripeInvalidRequestError",
        raw: {
          code: "resource_missing",
          doc_url: "https://stripe.com/docs/error-codes/resource-missing",
          message: "No such subscription: 'sub_123'",
          param: "id",
          type: "invalid_request_error",
        },
        code: "resource_missing",
      });

      const result = await service.cancelPhoneNumberSubscription(validCancelData);

      expect(result).toEqual({
        success: true,
        message: "Phone number subscription cancelled successfully.",
      });

      // Should attempt to cancel
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_123");
      // Should update database twice: first CANCELLED (disconnectAgents: false), then final CANCELLED (disconnectAgents: true)
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenCalledTimes(2);
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenNthCalledWith(1, {
        id: 1,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectAgents: false,
      });
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenNthCalledWith(2, {
        id: 1,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectAgents: true,
      });
    });

    it("should throw error on Stripe API failure that is not resource_missing", async () => {
      const mockPhoneNumber = createMockPhoneNumberRecord({
        id: 1,
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      });

      mocks.mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue(mockPhoneNumber);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      stripe.subscriptions.cancel.mockRejectedValue(new TestError("API Error"));

      await expect(service.cancelPhoneNumberSubscription(validCancelData)).rejects.toThrow(
        "Failed to cancel subscription"
      );

      // Should attempt to cancel
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_123");
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenCalledTimes(2);
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenNthCalledWith(1, {
        id: 1,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectAgents: false,
      });
      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenNthCalledWith(2, {
        id: 1,
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      });
    });
  });
});
