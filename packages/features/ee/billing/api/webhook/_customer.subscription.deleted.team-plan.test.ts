import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";
import handler from "./_customer.subscription.deleted.team-plan";

const { mockTeamBillingServiceFactory, mockTeamBillingDataRepository, mockTeamBillingService } = vi.hoisted(
  () => {
    const teamBillingServiceMock = {
      downgrade: vi.fn(),
    };

    const teamBillingServiceFactoryMock = {
      findAndInit: vi.fn(),
      init: vi.fn(),
    };

    const teamBillingDataRepositoryMock = {
      findBySubscriptionId: vi.fn(),
    };

    return {
      mockTeamBillingService: teamBillingServiceMock,
      mockTeamBillingServiceFactory: teamBillingServiceFactoryMock,
      mockTeamBillingDataRepository: teamBillingDataRepositoryMock,
    };
  }
);

vi.mock("../../di/containers/Billing", () => ({
  getTeamBillingServiceFactory: vi.fn().mockReturnValue(mockTeamBillingServiceFactory),
  getTeamBillingDataRepository: vi.fn().mockReturnValue(mockTeamBillingDataRepository),
}));

describe("customer.subscription.deleted.team-plan webhook", () => {
  const mockSubscriptionData = {
    object: {
      id: "sub_123456789",
      status: "canceled",
      metadata: {
        teamId: "42",
      },
    },
  } as unknown as SWHMap["customer.subscription.deleted"]["data"];

  const mockTeam = {
    id: 42,
    name: "Test Team",
    slug: "test-team",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful behavior
    mockTeamBillingServiceFactory.findAndInit.mockResolvedValue(mockTeamBillingService);
    mockTeamBillingServiceFactory.init.mockReturnValue(mockTeamBillingService);
    mockTeamBillingService.downgrade.mockResolvedValue(undefined);
    mockTeamBillingDataRepository.findBySubscriptionId.mockResolvedValue(mockTeam);
  });

  describe("valid metadata path", () => {
    it("should successfully downgrade team when metadata contains valid teamId", async () => {
      // Act
      const result = await handler(mockSubscriptionData);

      // Assert
      expect(mockTeamBillingServiceFactory.findAndInit).toHaveBeenCalledWith(42);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });

      // Should not fall back to repository lookup
      expect(mockTeamBillingDataRepository.findBySubscriptionId).not.toHaveBeenCalled();
      expect(mockTeamBillingServiceFactory.init).not.toHaveBeenCalled();
    });

    it("should handle string teamId in metadata", async () => {
      // Arrange
      const subscriptionWithStringTeamId = {
        object: {
          id: "sub_123456789",
          status: "canceled",
          metadata: {
            teamId: "123", // string that should be coerced to number
          },
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(subscriptionWithStringTeamId);

      // Assert
      expect(mockTeamBillingServiceFactory.findAndInit).toHaveBeenCalledWith(123);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it("should fall back to repository lookup when findAndInit fails", async () => {
      // Arrange
      const factoryError = new Error("Team billing factory error");
      mockTeamBillingServiceFactory.findAndInit.mockRejectedValue(factoryError);

      // Act
      const result = await handler(mockSubscriptionData);

      // Should have attempted the metadata path first
      expect(mockTeamBillingServiceFactory.findAndInit).toHaveBeenCalledWith(42);

      // Should fall back to repository lookup
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_123456789");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(mockTeam);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it("should fall back to repository lookup when downgrade fails in metadata path", async () => {
      // Arrange
      const downgradeError = new Error("Downgrade failed");
      mockTeamBillingService.downgrade
        .mockRejectedValueOnce(downgradeError) // First call fails
        .mockResolvedValueOnce(undefined); // Second call succeeds

      // Act
      const result = await handler(mockSubscriptionData);

      // Should have attempted the metadata path first
      expect(mockTeamBillingServiceFactory.findAndInit).toHaveBeenCalledWith(42);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(2); // Called twice - first failed, second succeeded

      // Should fall back to repository lookup
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_123456789");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(mockTeam);
      expect(result).toEqual({ success: true });
    });
  });

  describe("invalid metadata fallback path", () => {
    it("should fallback to findBySubscriptionId when metadata is missing", async () => {
      // Arrange
      const subscriptionWithoutMetadata = {
        object: {
          id: "sub_123456789",
          status: "canceled",
          metadata: {}, // Empty metadata
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(subscriptionWithoutMetadata);

      // Assert
      expect(mockTeamBillingServiceFactory.findAndInit).not.toHaveBeenCalled();
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_123456789");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(mockTeam);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it("should fallback to findBySubscriptionId when teamId is invalid", async () => {
      // Arrange
      const subscriptionWithInvalidTeamId = {
        object: {
          id: "sub_123456789",
          status: "canceled",
          metadata: {
            teamId: "invalid-team-id", // This will fail zod parsing
          },
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(subscriptionWithInvalidTeamId);

      // Assert
      expect(mockTeamBillingServiceFactory.findAndInit).not.toHaveBeenCalled();
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_123456789");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(mockTeam);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it("should fallback to findBySubscriptionId when metadata is null", async () => {
      // Arrange
      const subscriptionWithNullMetadata = {
        object: {
          id: "sub_123456789",
          status: "canceled",
          metadata: null, // Null metadata
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(subscriptionWithNullMetadata);

      // Assert
      expect(mockTeamBillingServiceFactory.findAndInit).not.toHaveBeenCalled();
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_123456789");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(mockTeam);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });
  });

  describe("fallback team found path", () => {
    it("should successfully downgrade when fallback finds team", async () => {
      // Arrange - Force metadata parsing to fail
      const subscriptionWithoutTeamId = {
        object: {
          id: "sub_fallback_test",
          status: "canceled",
          metadata: {
            someOtherField: "value", // No teamId
          },
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      const fallbackTeam = {
        id: 99,
        name: "Fallback Team",
        slug: "fallback-team",
      };

      mockTeamBillingDataRepository.findBySubscriptionId.mockResolvedValue(fallbackTeam);

      // Act
      const result = await handler(subscriptionWithoutTeamId);

      // Assert
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_fallback_test");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(fallbackTeam);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it("should propagate error when fallback downgrade fails", async () => {
      // Arrange
      const subscriptionWithoutTeamId = {
        object: {
          id: "sub_error_test",
          status: "canceled",
          metadata: {},
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      const downgradeError = new Error("Fallback downgrade failed");
      mockTeamBillingService.downgrade.mockRejectedValue(downgradeError);

      // Act & Assert
      await expect(handler(subscriptionWithoutTeamId)).rejects.toThrow("Fallback downgrade failed");

      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_error_test");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(mockTeam);
      expect(mockTeamBillingService.downgrade).toHaveBeenCalledTimes(1);
    });
  });

  describe("fallback team not found path", () => {
    it("should return success: false when no team found by subscriptionId", async () => {
      // Arrange
      const subscriptionWithoutTeamId = {
        object: {
          id: "sub_not_found",
          status: "canceled",
          metadata: {},
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      mockTeamBillingDataRepository.findBySubscriptionId.mockResolvedValue(null);

      // Act
      const result = await handler(subscriptionWithoutTeamId);

      // Assert
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_not_found");
      expect(mockTeamBillingServiceFactory.init).not.toHaveBeenCalled();
      expect(mockTeamBillingService.downgrade).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false });
    });

    it("should return success: false when findBySubscriptionId returns undefined", async () => {
      // Arrange
      const subscriptionWithoutTeamId = {
        object: {
          id: "sub_undefined",
          status: "canceled",
          metadata: {},
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      mockTeamBillingDataRepository.findBySubscriptionId.mockResolvedValue(undefined);

      // Act
      const result = await handler(subscriptionWithoutTeamId);

      // Assert
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_undefined");
      expect(result).toEqual({ success: false });
    });

    it("should propagate error when repository lookup fails", async () => {
      // Arrange
      const subscriptionWithoutTeamId = {
        object: {
          id: "sub_repo_error",
          status: "canceled",
          metadata: {},
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      const repositoryError = new Error("Database connection failed");
      mockTeamBillingDataRepository.findBySubscriptionId.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(handler(subscriptionWithoutTeamId)).rejects.toThrow("Database connection failed");

      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_repo_error");
      expect(mockTeamBillingServiceFactory.init).not.toHaveBeenCalled();
      expect(mockTeamBillingService.downgrade).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle subscription with no metadata at all", async () => {
      // Arrange
      const subscriptionWithoutMetadata = {
        object: {
          id: "sub_no_metadata",
          status: "canceled",
          // metadata property completely missing
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(subscriptionWithoutMetadata);

      // Assert
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_no_metadata");
      expect(result).toEqual({ success: true });
    });

    it("should handle teamId that coerces to 0", async () => {
      // Arrange
      const subscriptionWithZeroTeamId = {
        object: {
          id: "sub_zero_team",
          status: "canceled",
          metadata: {
            teamId: "0", // Should coerce to number 0
          },
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Act
      const result = await handler(subscriptionWithZeroTeamId);

      // Assert
      expect(mockTeamBillingServiceFactory.findAndInit).toHaveBeenCalledWith(0);
      expect(result).toEqual({ success: true });
    });

    it("should handle multiple errors in both paths", async () => {
      // Arrange
      const subscriptionData = {
        object: {
          id: "sub_multiple_errors",
          status: "canceled",
          metadata: {
            teamId: "42",
          },
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      // Make both the metadata path and fallback path fail
      mockTeamBillingServiceFactory.findAndInit.mockRejectedValue(new Error("Factory error"));
      mockTeamBillingDataRepository.findBySubscriptionId.mockRejectedValue(new Error("Repository error"));

      // Act & Assert
      await expect(handler(subscriptionData)).rejects.toThrow("Repository error");

      expect(mockTeamBillingServiceFactory.findAndInit).toHaveBeenCalledWith(42);
      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_multiple_errors");
    });

    it("should handle init returning service that fails", async () => {
      // Arrange
      const subscriptionWithoutTeamId = {
        object: {
          id: "sub_init_fail",
          status: "canceled",
          metadata: {},
        },
      } as unknown as SWHMap["customer.subscription.deleted"]["data"];

      const initError = new Error("Init failed");
      mockTeamBillingServiceFactory.init.mockImplementation(() => {
        throw initError;
      });

      // Act & Assert
      await expect(handler(subscriptionWithoutTeamId)).rejects.toThrow("Init failed");

      expect(mockTeamBillingDataRepository.findBySubscriptionId).toHaveBeenCalledWith("sub_init_fail");
      expect(mockTeamBillingServiceFactory.init).toHaveBeenCalledWith(mockTeam);
    });
  });
});
