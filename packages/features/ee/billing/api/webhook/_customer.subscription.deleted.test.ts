import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";
import handler from "./_customer.subscription.deleted";

const {
  mockFindByStripeSubscriptionId,
  mockCancelPhoneNumberSubscription,
  mockCreateDefaultAIPhoneServiceProvider,
  mockProductRouter,
  prismaMock,
} = vi.hoisted(() => {
  const findByStripeSubscriptionIdFn = vi.fn();
  const cancelPhoneNumberSubscriptionFn = vi.fn();
  const createDefaultAIPhoneServiceProviderFn = vi.fn();
  const productRouterFn = vi.fn();
  const prismaMockObj = {};

  return {
    mockFindByStripeSubscriptionId: findByStripeSubscriptionIdFn,
    mockCancelPhoneNumberSubscription: cancelPhoneNumberSubscriptionFn,
    mockCreateDefaultAIPhoneServiceProvider: createDefaultAIPhoneServiceProviderFn,
    mockProductRouter: productRouterFn,
    prismaMock: prismaMockObj,
  };
});

vi.mock("@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository", () => ({
  PrismaPhoneNumberRepository: class {
    findByStripeSubscriptionId = mockFindByStripeSubscriptionId;
  },
}));

vi.mock("@calcom/features/calAIPhone", () => ({
  createDefaultAIPhoneServiceProvider: mockCreateDefaultAIPhoneServiceProvider,
}));

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));

// Mock the productRouter import at module level
vi.mock("./__handler", async () => {
  const actual = await vi.importActual("./__handler");
  return {
    ...actual,
    productRouter: vi.fn().mockReturnValue(mockProductRouter),
  };
});

describe("customer.subscription.deleted webhook", () => {
  const mockSubscriptionData = {
    object: {
      id: "sub_123",
      status: "canceled",
      items: {
        data: [
          {
            plan: {
              product: "prod_team123",
            },
          },
        ],
      },
    },
  } as unknown as SWHMap["customer.subscription.deleted"]["data"];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default setup for createDefaultAIPhoneServiceProvider
    mockCreateDefaultAIPhoneServiceProvider.mockReturnValue({
      cancelPhoneNumberSubscription: mockCancelPhoneNumberSubscription,
    });

    // Default setup for productRouter
    mockProductRouter.mockResolvedValue({ success: true, routed: true });
  });

  describe("phone number subscription handling", () => {
    it("should cancel phone number subscription when phone number found", async () => {
      // Arrange
      const mockPhoneNumber = {
        id: "phone_123",
        userId: "user_123",
        teamId: "team_123",
        subscriptionStatus: "ACTIVE",
      };
      mockFindByStripeSubscriptionId.mockResolvedValue(mockPhoneNumber);
      mockCancelPhoneNumberSubscription.mockResolvedValue(undefined);

      // Act
      const result = await handler(mockSubscriptionData);

      // Assert
      expect(mockFindByStripeSubscriptionId).toHaveBeenCalledWith({
        stripeSubscriptionId: "sub_123",
      });
      expect(mockCancelPhoneNumberSubscription).toHaveBeenCalledWith({
        phoneNumberId: "phone_123",
        userId: "user_123",
        teamId: "team_123",
      });
      expect(result).toEqual({
        success: true,
        subscriptionId: "sub_123",
      });
      expect(mockProductRouter).not.toHaveBeenCalled();
    });

    it("should skip cancellation when phone number already CANCELLED", async () => {
      // Arrange
      const mockPhoneNumber = {
        id: "phone_123",
        userId: "user_123",
        teamId: "team_123",
        subscriptionStatus: "CANCELLED",
      };
      mockFindByStripeSubscriptionId.mockResolvedValue(mockPhoneNumber);

      // Act
      const result = await handler(mockSubscriptionData);

      // Assert
      expect(mockFindByStripeSubscriptionId).toHaveBeenCalledWith({
        stripeSubscriptionId: "sub_123",
      });
      expect(mockCancelPhoneNumberSubscription).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        subscriptionId: "sub_123",
        skipped: true,
      });
      expect(mockProductRouter).not.toHaveBeenCalled();
    });

    it("should throw HttpCode 400 when subscription ID is missing", async () => {
      // Arrange
      const mockPhoneNumber = {
        id: "phone_123",
        userId: "user_123",
        teamId: "team_123",
        subscriptionStatus: "ACTIVE",
      };
      mockFindByStripeSubscriptionId.mockResolvedValue(mockPhoneNumber);

      const dataWithoutSubscriptionId = {
        object: {
          id: "", // Empty subscription ID
          status: "canceled",
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act & Assert
      await expect(handler(dataWithoutSubscriptionId)).rejects.toThrow(
        new HttpCode(400, "Subscription ID not found")
      );
      expect(mockCancelPhoneNumberSubscription).not.toHaveBeenCalled();
    });

    it("should throw HttpCode 400 when phone number has no userId", async () => {
      // Arrange
      const mockPhoneNumber = {
        id: "phone_123",
        userId: null, // Missing userId
        teamId: "team_123",
        subscriptionStatus: "ACTIVE",
      };
      mockFindByStripeSubscriptionId.mockResolvedValue(mockPhoneNumber);

      // Act & Assert
      await expect(handler(mockSubscriptionData)).rejects.toThrow(
        new HttpCode(400, "Phone number does not belong to a user")
      );
      expect(mockCancelPhoneNumberSubscription).not.toHaveBeenCalled();
    });

    it("should throw HttpCode 500 when AI service fails", async () => {
      // Arrange
      const mockPhoneNumber = {
        id: "phone_123",
        userId: "user_123",
        teamId: "team_123",
        subscriptionStatus: "ACTIVE",
      };
      mockFindByStripeSubscriptionId.mockResolvedValue(mockPhoneNumber);
      mockCancelPhoneNumberSubscription.mockRejectedValue(new Error("AI service error"));

      // Act & Assert
      await expect(handler(mockSubscriptionData)).rejects.toThrow(
        new HttpCode(500, "Failed to update phone number subscription")
      );
      expect(mockCancelPhoneNumberSubscription).toHaveBeenCalledWith({
        phoneNumberId: "phone_123",
        userId: "user_123",
        teamId: "team_123",
      });
    });

    it("should handle phone number with undefined teamId", async () => {
      // Arrange
      const mockPhoneNumber = {
        id: "phone_123",
        userId: "user_123",
        teamId: null, // null teamId
        subscriptionStatus: "ACTIVE",
      };
      mockFindByStripeSubscriptionId.mockResolvedValue(mockPhoneNumber);
      mockCancelPhoneNumberSubscription.mockResolvedValue(undefined);

      // Act
      const result = await handler(mockSubscriptionData);

      // Assert
      expect(mockCancelPhoneNumberSubscription).toHaveBeenCalledWith({
        phoneNumberId: "phone_123",
        userId: "user_123",
        teamId: undefined, // Should convert null to undefined
      });
      expect(result).toEqual({
        success: true,
        subscriptionId: "sub_123",
      });
    });
  });

  describe("product routing", () => {
    it("should route to product handler when phone number not found", async () => {
      // Arrange
      mockFindByStripeSubscriptionId.mockResolvedValue(null);
      mockProductRouter.mockResolvedValue({ success: true, productRouted: true });

      // Act
      const result = await handler(mockSubscriptionData);

      // Assert
      expect(mockFindByStripeSubscriptionId).toHaveBeenCalledWith({
        stripeSubscriptionId: "sub_123",
      });
      expect(mockProductRouter).toHaveBeenCalledWith(mockSubscriptionData);
      expect(result).toEqual({ success: true, productRouted: true });
      expect(mockCancelPhoneNumberSubscription).not.toHaveBeenCalled();
    });

    it("should handle product router failure", async () => {
      // Arrange
      mockFindByStripeSubscriptionId.mockResolvedValue(null);
      mockProductRouter.mockResolvedValue({ success: false, message: "No handler found" });

      // Act
      const result = await handler(mockSubscriptionData);

      // Assert
      expect(mockProductRouter).toHaveBeenCalledWith(mockSubscriptionData);
      expect(result).toEqual({ success: false, message: "No handler found" });
    });

    it("should handle product router throwing error", async () => {
      // Arrange
      mockFindByStripeSubscriptionId.mockResolvedValue(null);
      mockProductRouter.mockRejectedValue(new Error("Product router error"));

      // Act & Assert
      await expect(handler(mockSubscriptionData)).rejects.toThrow("Product router error");
    });
  });

  describe("edge cases", () => {
    it("should handle repository error", async () => {
      // Arrange
      mockFindByStripeSubscriptionId.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(handler(mockSubscriptionData)).rejects.toThrow("Database error");
    });

    it("should handle subscription with legacy plan structure", async () => {
      // Arrange
      mockFindByStripeSubscriptionId.mockResolvedValue(null);
      mockProductRouter.mockResolvedValue({ success: true });

      const legacySubscriptionData = {
        object: {
          id: "sub_123",
          status: "canceled",
          plan: {
            product: "prod_legacy123",
          },
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(legacySubscriptionData);

      // Assert
      expect(mockProductRouter).toHaveBeenCalledWith(legacySubscriptionData);
      expect(result).toEqual({ success: true });
    });

    it("should handle subscription without items or plan", async () => {
      // Arrange
      mockFindByStripeSubscriptionId.mockResolvedValue(null);
      mockProductRouter.mockResolvedValue({ success: false, message: "No product ID found" });

      const subscriptionWithoutProduct = {
        object: {
          id: "sub_123",
          status: "canceled",
          // No items or plan
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(subscriptionWithoutProduct);

      // Assert
      expect(mockProductRouter).toHaveBeenCalledWith(subscriptionWithoutProduct);
      expect(result).toEqual({ success: false, message: "No product ID found" });
    });
  });
});
