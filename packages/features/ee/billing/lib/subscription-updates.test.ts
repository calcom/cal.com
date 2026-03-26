import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import type { IBillingProviderService } from "../service/billingProvider/IBillingProviderService";
import { updateSubscriptionQuantity } from "./subscription-updates";

describe("subscription-updates", () => {
  let mockBillingService: IBillingProviderService;
  let mockLogger: ISimpleLogger;

  beforeEach(() => {
    mockBillingService = {
      handleSubscriptionUpdate: vi.fn(),
    } as Partial<IBillingProviderService> as IBillingProviderService;

    mockLogger = {
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
  });

  describe("updateSubscriptionQuantity", () => {
    it("should call handleSubscriptionUpdate with correct parameters on success", async () => {
      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        quantity: 5,
      };

      await updateSubscriptionQuantity(params);

      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        membershipCount: 5,
      });
    });

    it("should forward prorationBehavior parameter when provided", async () => {
      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        quantity: 5,
        prorationBehavior: "none" as const,
      };

      await updateSubscriptionQuantity(params);

      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        membershipCount: 5,
        prorationBehavior: "none",
      });
    });

    it("should not include prorationBehavior when not provided", async () => {
      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        quantity: 5,
      };

      await updateSubscriptionQuantity(params);

      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        membershipCount: 5,
      });
    });

    it("should forward all prorationBehavior values correctly", async () => {
      const prorationBehaviors = ["none", "create_prorations", "always_invoice"] as const;

      for (const prorationBehavior of prorationBehaviors) {
        vi.clearAllMocks();
        const params = {
          billingService: mockBillingService,
          subscriptionId: "sub_123",
          subscriptionItemId: "item_123",
          quantity: 5,
          prorationBehavior,
        };

        await updateSubscriptionQuantity(params);

        expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
          subscriptionId: "sub_123",
          subscriptionItemId: "item_123",
          membershipCount: 5,
          prorationBehavior,
        });
      }
    });

    it("should re-throw error when billing service fails and no logger provided", async () => {
      const error = new Error("Billing service error");
      vi.mocked(mockBillingService.handleSubscriptionUpdate).mockRejectedValue(error);

      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        quantity: 5,
      };

      await expect(updateSubscriptionQuantity(params)).rejects.toThrow("Billing service error");
    });

    it("should log error and re-throw when billing service fails and logger provided", async () => {
      const error = new Error("Billing service error");
      vi.mocked(mockBillingService.handleSubscriptionUpdate).mockRejectedValue(error);

      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        quantity: 5,
        logger: mockLogger,
      };

      await expect(updateSubscriptionQuantity(params)).rejects.toThrow("Billing service error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to update subscription sub_123 quantity to 5:",
        error
      );
    });

    it("should not log when no error occurs", async () => {
      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        quantity: 5,
        logger: mockLogger,
      };

      await updateSubscriptionQuantity(params);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should handle different error types correctly", async () => {
      const stringError = "String error";
      vi.mocked(mockBillingService.handleSubscriptionUpdate).mockRejectedValue(stringError);

      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        quantity: 5,
        logger: mockLogger,
      };

      await expect(updateSubscriptionQuantity(params)).rejects.toBe(stringError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to update subscription sub_123 quantity to 5:",
        stringError
      );
    });

    it("should work with different quantity values", async () => {
      const quantities = [0, 1, 10, 100];

      for (const quantity of quantities) {
        vi.clearAllMocks();
        const params = {
          billingService: mockBillingService,
          subscriptionId: "sub_123",
          subscriptionItemId: "item_123",
          quantity,
        };

        await updateSubscriptionQuantity(params);

        expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
          subscriptionId: "sub_123",
          subscriptionItemId: "item_123",
          membershipCount: quantity,
        });
      }
    });

    it("should work with different subscription IDs", async () => {
      const subscriptionIds = ["sub_123", "sub_test_456", "sub_prod_789"];

      for (const subscriptionId of subscriptionIds) {
        vi.clearAllMocks();
        const params = {
          billingService: mockBillingService,
          subscriptionId,
          subscriptionItemId: "item_123",
          quantity: 5,
        };

        await updateSubscriptionQuantity(params);

        expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
          subscriptionId,
          subscriptionItemId: "item_123",
          membershipCount: 5,
        });
      }
    });

    it("should work with different subscription item IDs", async () => {
      const subscriptionItemIds = ["item_123", "si_test_456", "si_prod_789"];

      for (const subscriptionItemId of subscriptionItemIds) {
        vi.clearAllMocks();
        const params = {
          billingService: mockBillingService,
          subscriptionId: "sub_123",
          subscriptionItemId,
          quantity: 5,
        };

        await updateSubscriptionQuantity(params);

        expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
          subscriptionId: "sub_123",
          subscriptionItemId,
          membershipCount: 5,
        });
      }
    });

    it("should handle complex scenario with all parameters and error", async () => {
      const error = new Error("Complex billing error");
      vi.mocked(mockBillingService.handleSubscriptionUpdate).mockRejectedValue(error);

      const params = {
        billingService: mockBillingService,
        subscriptionId: "sub_complex_123",
        subscriptionItemId: "item_complex_456",
        quantity: 25,
        prorationBehavior: "create_prorations" as const,
        logger: mockLogger,
      };

      await expect(updateSubscriptionQuantity(params)).rejects.toThrow("Complex billing error");

      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_complex_123",
        subscriptionItemId: "item_complex_456",
        membershipCount: 25,
        prorationBehavior: "create_prorations",
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to update subscription sub_complex_123 quantity to 25:",
        error
      );
    });
  });
});
