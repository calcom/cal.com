import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const {
  mockCreateDefaultAIPhoneServiceProvider,
  mockCreatePhoneNumber,
  mockUpdatePhoneNumber,
  mockFindByIdWithUserAccess,
  mockCreatePhoneNumberRepo,
  mockPrismaUpdate,
} = vi.hoisted(() => {
  const createPhoneNumberFn = vi.fn();
  const updatePhoneNumberFn = vi.fn();
  const findByIdWithUserAccessFn = vi.fn();
  const createPhoneNumberRepoFn = vi.fn();
  const prismaUpdateFn = vi.fn();

  const createDefaultAIPhoneServiceProviderFn = vi.fn().mockReturnValue({
    createPhoneNumber: createPhoneNumberFn,
    updatePhoneNumber: updatePhoneNumberFn,
  });

  return {
    mockCreateDefaultAIPhoneServiceProvider: createDefaultAIPhoneServiceProviderFn,
    mockCreatePhoneNumber: createPhoneNumberFn,
    mockUpdatePhoneNumber: updatePhoneNumberFn,
    mockFindByIdWithUserAccess: findByIdWithUserAccessFn,
    mockCreatePhoneNumberRepo: createPhoneNumberRepoFn,
    mockPrismaUpdate: prismaUpdateFn,
  };
});

vi.mock("@calcom/features/calAIPhone", () => ({
  createDefaultAIPhoneServiceProvider: mockCreateDefaultAIPhoneServiceProvider,
}));

vi.mock("@calcom/features/calAIPhone/repositories/PrismaAgentRepository", () => ({
  PrismaAgentRepository: class {
    constructor(_prisma: unknown) {}
    findByIdWithUserAccess = mockFindByIdWithUserAccess;
  },
}));

vi.mock("@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository", () => ({
  PrismaPhoneNumberRepository: class {
    constructor(_prisma: unknown) {}
    createPhoneNumber = mockCreatePhoneNumberRepo;
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    calAiPhoneNumber: {
      update: mockPrismaUpdate,
    },
  },
}));

import handler from "./_checkout.session.completed.phone";

function buildSessionData(
  overrides: Partial<SWHMap["checkout.session.completed"]["data"]["object"]> = {}
): SWHMap["checkout.session.completed"]["data"] {
  return {
    object: {
      id: "cs_test_123",
      customer: "cus_test_123",
      subscription: "sub_test_123",
      metadata: {
        userId: "1",
        teamId: "2",
        agentId: "agent_123",
      },
      ...overrides,
    },
  } as SWHMap["checkout.session.completed"]["data"];
}

describe("checkout.session.completed.phone webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mocks
    mockFindByIdWithUserAccess.mockResolvedValue({
      id: "agent_123",
      providerAgentId: "retell_agent_123",
    });

    mockCreatePhoneNumber.mockResolvedValue({
      phone_number: "+15551234567",
      provider: "retell",
    });

    mockCreatePhoneNumberRepo.mockResolvedValue({
      id: "phone_1",
      phoneNumber: "+15551234567",
    });

    mockPrismaUpdate.mockResolvedValue({});
  });

  describe("success scenarios", () => {
    it("should successfully create phone number with string subscription", async () => {
      const sessionData = buildSessionData({
        subscription: "sub_test_123",
      });

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      // Verify agent lookup
      expect(mockFindByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "agent_123",
        userId: 1,
        teamId: 2,
      });

      // Verify phone creation
      expect(mockCreatePhoneNumber).toHaveBeenCalledWith({
        nickname: expect.stringMatching(/^userId:1-teamId:2-\d+$/),
      });

      // Verify phone repo creation
      expect(mockCreatePhoneNumberRepo).toHaveBeenCalledWith({
        userId: 1,
        teamId: 2,
        phoneNumber: "+15551234567",
        provider: "retell",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        subscriptionStatus: "ACTIVE",
        providerPhoneNumberId: "+15551234567",
      });

      // Verify agent linking (second agent lookup)
      expect(mockFindByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "agent_123",
        userId: 1,
      });

      // Verify phone update
      expect(mockUpdatePhoneNumber).toHaveBeenCalledWith("+15551234567", {
        outbound_agent_id: "retell_agent_123",
      });

      // Verify prisma update
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: "phone_1" },
        data: {
          outboundAgent: {
            connect: { id: "agent_123" },
          },
        },
      });
    });

    it("should successfully create phone number with object subscription", async () => {
      const sessionData = buildSessionData({
        subscription: { id: "sub_test_456" } as any,
      });

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockCreatePhoneNumberRepo).toHaveBeenCalledWith({
        userId: 1,
        teamId: 2,
        phoneNumber: "+15551234567",
        provider: "retell",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_456",
        subscriptionStatus: "ACTIVE",
        providerPhoneNumberId: "+15551234567",
      });
    });

    it("should work without teamId", async () => {
      const sessionData = buildSessionData({
        metadata: {
          userId: "1",
          agentId: "agent_123",
        },
      });

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockFindByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "agent_123",
        userId: 1,
        teamId: undefined,
      });

      expect(mockCreatePhoneNumber).toHaveBeenCalledWith({
        nickname: expect.stringMatching(/^userId:1-\d+$/),
      });

      expect(mockCreatePhoneNumberRepo).toHaveBeenCalledWith({
        userId: 1,
        teamId: undefined,
        phoneNumber: "+15551234567",
        provider: "retell",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        subscriptionStatus: "ACTIVE",
        providerPhoneNumberId: "+15551234567",
      });
    });
  });

  describe("validation errors", () => {
    it("should throw 400 when userId is missing", async () => {
      const sessionData = buildSessionData({
        metadata: {
          agentId: "agent_123",
        },
      });

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(400, "Missing required data for phone number subscription")
      );
    });

    it("should throw 400 when userId is invalid", async () => {
      const sessionData = buildSessionData({
        metadata: {
          userId: "invalid",
          agentId: "agent_123",
        },
      });

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(400, "Missing required data for phone number subscription")
      );
    });

    it("should throw 400 when subscription is missing", async () => {
      const sessionData = buildSessionData({
        subscription: null,
      });

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(400, "Missing required data for phone number subscription")
      );
    });

    it("should throw 400 when agentId is missing", async () => {
      const sessionData = buildSessionData({
        metadata: {
          userId: "1",
          teamId: "2",
        },
      });

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(400, "Missing agentId for phone number subscription")
      );
    });

    it("should throw 400 when agentId is empty", async () => {
      const sessionData = buildSessionData({
        metadata: {
          userId: "1",
          teamId: "2",
          agentId: "",
        },
      });

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(400, "Missing agentId for phone number subscription")
      );
    });

    it("should throw 400 when agentId is only whitespace", async () => {
      const sessionData = buildSessionData({
        metadata: {
          userId: "1",
          teamId: "2",
          agentId: "   ",
        },
      });

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(400, "Missing agentId for phone number subscription")
      );
    });

    it("should throw 400 when subscription data is invalid", async () => {
      const sessionData = buildSessionData({
        subscription: { id: null } as any,
      });

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(400, "Invalid subscription data")
      );
    });
  });

  describe("agent errors", () => {
    it("should throw 404 when agent is not found", async () => {
      mockFindByIdWithUserAccess.mockResolvedValue(null);

      const sessionData = buildSessionData();

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(404, "Agent not found or user does not have access to it")
      );
    });

    it("should throw 404 when user does not have access to agent", async () => {
      mockFindByIdWithUserAccess.mockResolvedValue(null);

      const sessionData = buildSessionData();

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(404, "Agent not found or user does not have access to it")
      );
    });
  });

  describe("phone creation errors", () => {
    it("should throw 500 when phone creation returns null", async () => {
      mockCreatePhoneNumber.mockResolvedValue(null);

      const sessionData = buildSessionData();

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(500, "Failed to create phone number - invalid response")
      );
    });

    it("should throw 500 when phone creation returns empty phone_number", async () => {
      mockCreatePhoneNumber.mockResolvedValue({
        phone_number: "",
        provider: "retell",
      });

      const sessionData = buildSessionData();

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(500, "Failed to create phone number - invalid response")
      );
    });

    it("should throw 500 when phone creation returns undefined phone_number", async () => {
      mockCreatePhoneNumber.mockResolvedValue({
        phone_number: undefined,
        provider: "retell",
      });

      const sessionData = buildSessionData();

      await expect(handler(sessionData)).rejects.toThrow(
        new HttpCode(500, "Failed to create phone number - invalid response")
      );
    });

    it("should throw 500 when aiService.createPhoneNumber fails", async () => {
      mockCreatePhoneNumber.mockRejectedValue(new Error("Retell API error"));

      const sessionData = buildSessionData();

      await expect(handler(sessionData)).rejects.toThrow("Retell API error");
    });

    it("should throw error when phoneNumberRepo.createPhoneNumber fails", async () => {
      mockCreatePhoneNumberRepo.mockRejectedValue(new Error("Database error"));

      const sessionData = buildSessionData();

      await expect(handler(sessionData)).rejects.toThrow("Database error");
    });
  });

  describe("agent linking errors (graceful handling)", () => {
    it("should succeed even when agent linking fails due to agent not found on second lookup", async () => {
      // First call succeeds, second call fails
      mockFindByIdWithUserAccess
        .mockResolvedValueOnce({
          id: "agent_123",
          providerAgentId: "retell_agent_123",
        })
        .mockResolvedValueOnce(null);

      const sessionData = buildSessionData();

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      // Should still create the phone number
      expect(mockCreatePhoneNumberRepo).toHaveBeenCalled();
      // But should not update the phone or prisma due to error
      expect(mockUpdatePhoneNumber).not.toHaveBeenCalled();
      expect(mockPrismaUpdate).not.toHaveBeenCalled();
    });

    it("should succeed even when aiService.updatePhoneNumber fails", async () => {
      mockUpdatePhoneNumber.mockRejectedValue(new Error("Retell update failed"));

      const sessionData = buildSessionData();

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockCreatePhoneNumberRepo).toHaveBeenCalled();
      expect(mockUpdatePhoneNumber).toHaveBeenCalled();
      // Should not reach prisma update due to error
      expect(mockPrismaUpdate).not.toHaveBeenCalled();
    });

    it("should succeed even when prisma update fails", async () => {
      // Reset mocks to isolate this test
      vi.clearAllMocks();
      
      // Set up successful flow up to prisma update
      mockFindByIdWithUserAccess.mockResolvedValue({
        id: "agent_123",
        providerAgentId: "retell_agent_123",
      });
      mockCreatePhoneNumber.mockResolvedValue({
        phone_number: "+15551234567",
        provider: "retell",
      });
      mockCreatePhoneNumberRepo.mockResolvedValue({
        id: "phone_1",
        phoneNumber: "+15551234567",
      });
      mockUpdatePhoneNumber.mockResolvedValue({});
      
      // This should cause the error
      mockPrismaUpdate.mockRejectedValue(new Error("Database update failed"));

      const sessionData = buildSessionData();

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockCreatePhoneNumberRepo).toHaveBeenCalled();
      expect(mockUpdatePhoneNumber).toHaveBeenCalled();
      expect(mockPrismaUpdate).toHaveBeenCalled();
    });

    it("should succeed even when entire agent linking process fails", async () => {
      // First call succeeds, but second call throws
      mockFindByIdWithUserAccess
        .mockResolvedValueOnce({
          id: "agent_123",
          providerAgentId: "retell_agent_123",
        })
        .mockRejectedValueOnce(new Error("Database error on second lookup"));

      const sessionData = buildSessionData();

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockCreatePhoneNumberRepo).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle teamId as string '0'", async () => {
      const sessionData = buildSessionData({
        metadata: {
          userId: "1",
          teamId: "0",
          agentId: "agent_123",
        },
      });

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockFindByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "agent_123",
        userId: 1,
        teamId: 0,
      });
    });

    it("should handle large user and team IDs", async () => {
      const sessionData = buildSessionData({
        metadata: {
          userId: "999999999",
          teamId: "888888888",
          agentId: "agent_123",
        },
      });

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockFindByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "agent_123",
        userId: 999999999,
        teamId: 888888888,
      });
    });

    it("should handle subscription object with extra properties", async () => {
      const sessionData = buildSessionData({
        subscription: {
          id: "sub_test_complex",
          status: "active",
          extra_property: "ignored",
        } as any,
      });

      const result = await handler(sessionData);

      expect(result).toEqual({
        success: true,
        phoneNumber: "+15551234567",
      });

      expect(mockCreatePhoneNumberRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeSubscriptionId: "sub_test_complex",
        })
      );
    });
  });
});