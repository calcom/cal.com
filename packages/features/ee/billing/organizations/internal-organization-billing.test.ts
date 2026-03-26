import { beforeEach, describe, expect, it, vi } from "vitest";

import { InternalOrganizationBilling } from "./internal-organization-billing";
import type { OrganizationBillingRepository } from "./organization-billing.repository";

// Mock the stripe import
vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: vi.fn(),
    },
    paymentIntents: {
      create: vi.fn(),
    },
  },
}));

// Import the mocked stripe after mocking
const { stripe } = await import("@calcom/features/ee/payments/server/stripe");

describe("InternalOrganizationBilling", () => {
  let internalOrganizationBilling: InternalOrganizationBilling;
  let mockRepository: OrganizationBillingRepository;
  const mockOrganization = {
    id: 1,
    slug: "test-org",
    name: "Test Organization",
    billingPeriod: "monthly" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock repository
    mockRepository = {
      getStripeCustomerId: vi.fn(),
      getSubscriptionId: vi.fn(),
    } as unknown as OrganizationBillingRepository;

    // Create instance with mock repository
    internalOrganizationBilling = new InternalOrganizationBilling(mockOrganization, mockRepository);
  });

  describe("getStripeCustomerId", () => {
    it("should delegate to repository with organization id", async () => {
      const expectedCustomerId = "cus_123";
      vi.mocked(mockRepository.getStripeCustomerId).mockResolvedValue(expectedCustomerId);

      const result = await internalOrganizationBilling.getStripeCustomerId();

      expect(result).toBe(expectedCustomerId);
      expect(mockRepository.getStripeCustomerId).toHaveBeenCalledWith(mockOrganization.id);
    });

    it("should return null when repository returns null", async () => {
      vi.mocked(mockRepository.getStripeCustomerId).mockResolvedValue(null);

      const result = await internalOrganizationBilling.getStripeCustomerId();

      expect(result).toBeNull();
      expect(mockRepository.getStripeCustomerId).toHaveBeenCalledWith(mockOrganization.id);
    });
  });

  describe("getSubscriptionId", () => {
    it("should delegate to repository with organization id", async () => {
      const expectedSubscriptionId = "sub_123";
      vi.mocked(mockRepository.getSubscriptionId).mockResolvedValue(expectedSubscriptionId);

      const result = await internalOrganizationBilling.getSubscriptionId();

      expect(result).toBe(expectedSubscriptionId);
      expect(mockRepository.getSubscriptionId).toHaveBeenCalledWith(mockOrganization.id);
    });

    it("should return null when repository returns null", async () => {
      vi.mocked(mockRepository.getSubscriptionId).mockResolvedValue(null);

      const result = await internalOrganizationBilling.getSubscriptionId();

      expect(result).toBeNull();
      expect(mockRepository.getSubscriptionId).toHaveBeenCalledWith(mockOrganization.id);
    });
  });

  describe("getSubscriptionItems", () => {
    it("should return empty array when subscriptionId is null", async () => {
      vi.mocked(mockRepository.getSubscriptionId).mockResolvedValue(null);

      const result = await internalOrganizationBilling.getSubscriptionItems();

      expect(result).toEqual([]);
      expect(mockRepository.getSubscriptionId).toHaveBeenCalledWith(mockOrganization.id);
      expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    it("should retrieve subscription and map items when subscriptionId exists", async () => {
      const subscriptionId = "sub_123";
      const mockSubscription = {
        items: {
          data: [
            { id: "item_1", quantity: 5 },
            { id: "item_2", quantity: 10 },
            { id: "item_3", quantity: null }, // Test null quantity handling
          ],
        },
      };

      vi.mocked(mockRepository.getSubscriptionId).mockResolvedValue(subscriptionId);
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription);

      const result = await internalOrganizationBilling.getSubscriptionItems();

      expect(result).toEqual([
        { id: "item_1", quantity: 5 },
        { id: "item_2", quantity: 10 },
        { id: "item_3", quantity: 0 }, // null should become 0
      ]);
      expect(mockRepository.getSubscriptionId).toHaveBeenCalledWith(mockOrganization.id);
      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(subscriptionId);
    });

    it("should handle empty subscription items", async () => {
      const subscriptionId = "sub_123";
      const mockSubscription = {
        items: {
          data: [],
        },
      };

      vi.mocked(mockRepository.getSubscriptionId).mockResolvedValue(subscriptionId);
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription);

      const result = await internalOrganizationBilling.getSubscriptionItems();

      expect(result).toEqual([]);
      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(subscriptionId);
    });
  });

  describe("createPaymentIntent", () => {
    it("should throw error when no stripe customer id found", async () => {
      vi.mocked(mockRepository.getStripeCustomerId).mockResolvedValue(null);

      await expect(
        internalOrganizationBilling.createPaymentIntent({
          seats: 5,
          pricePerSeat: 1000,
        })
      ).rejects.toThrow("No stripe customer id found");

      expect(mockRepository.getStripeCustomerId).toHaveBeenCalledWith(mockOrganization.id);
      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it("should create payment intent with correct parameters when customer id exists", async () => {
      const stripeCustomerId = "cus_123";
      const mockPaymentIntent = {
        id: "pi_123",
        client_secret: "pi_123_secret_456",
      };

      vi.mocked(mockRepository.getStripeCustomerId).mockResolvedValue(stripeCustomerId);
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue(mockPaymentIntent);

      const result = await internalOrganizationBilling.createPaymentIntent({
        seats: 5,
        pricePerSeat: 1000,
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(mockRepository.getStripeCustomerId).toHaveBeenCalledWith(mockOrganization.id);
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000, // seats * pricePerSeat
        currency: "usd",
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          organizationId: mockOrganization.id,
          seats: 5,
          pricePerSeat: 1000,
        },
      });
    });

    it("should calculate amount correctly for different seat/price combinations", async () => {
      const stripeCustomerId = "cus_456";
      vi.mocked(mockRepository.getStripeCustomerId).mockResolvedValue(stripeCustomerId);
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({ id: "pi_456" });

      await internalOrganizationBilling.createPaymentIntent({
        seats: 10,
        pricePerSeat: 2500,
      });

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 25000, // 10 * 2500
        currency: "usd",
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          organizationId: mockOrganization.id,
          seats: 10,
          pricePerSeat: 2500,
        },
      });
    });

    it("should handle zero seats", async () => {
      const stripeCustomerId = "cus_789";
      vi.mocked(mockRepository.getStripeCustomerId).mockResolvedValue(stripeCustomerId);
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({ id: "pi_789" });

      await internalOrganizationBilling.createPaymentIntent({
        seats: 0,
        pricePerSeat: 1000,
      });

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 0,
        currency: "usd",
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          organizationId: mockOrganization.id,
          seats: 0,
          pricePerSeat: 1000,
        },
      });
    });
  });

  describe("constructor", () => {
    it("should use provided repository", () => {
      const customRepository = {
        getStripeCustomerId: vi.fn(),
        getSubscriptionId: vi.fn(),
      } as unknown as OrganizationBillingRepository;

      const billing = new InternalOrganizationBilling(mockOrganization, customRepository);

      expect(billing["repository"]).toBe(customRepository);
    });

    it("should create default repository when none provided", () => {
      const billing = new InternalOrganizationBilling(mockOrganization);

      expect(billing["repository"]).toBeInstanceOf(Object);
      expect(billing["repository"]).toBeDefined();
    });
  });
});