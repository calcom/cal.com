import { HttpError } from "@calcom/lib/http-error";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneNumberService } from "../PhoneNumberService";
import {
  createMockDatabaseAgent,
  createMockPhoneNumber,
  createMockPhoneNumberRecord,
  setupBasicMocks,
  TestError,
} from "./test-utils";

describe("PhoneNumberService", () => {
  let service: PhoneNumberService;
  let mocks: ReturnType<typeof setupBasicMocks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupBasicMocks();

    service = new PhoneNumberService({
      retellRepository: mocks.mockRetellRepository,
      agentRepository: mocks.mockAgentRepository,
      phoneNumberRepository: mocks.mockPhoneNumberRepository,
      transactionManager: mocks.mockTransactionManager,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("importPhoneNumber", () => {
    const validImportData = {
      phone_number: "+1234567890",
      termination_uri: "https://example.com/webhook",
      sip_trunk_auth_username: "user",
      sip_trunk_auth_password: "pass",
      userId: 1,
      nickname: "Test Number",
      agentId: "agent-123",
    };

    it("should successfully import phone number with agent", async () => {
      const mockPhoneNumber = createMockPhoneNumber();
      const mockAgent = createMockDatabaseAgent();

      mocks.mockRetellRepository.importPhoneNumber.mockResolvedValue(mockPhoneNumber);
      mocks.mockAgentRepository.findByIdWithUserAccess.mockResolvedValue(mockAgent);
      mocks.mockRetellRepository.updatePhoneNumber.mockResolvedValue(mockPhoneNumber);

      const result = await service.importPhoneNumber(validImportData);

      expect(result).toEqual(mockPhoneNumber);
      expect(mocks.mockRetellRepository.importPhoneNumber).toHaveBeenCalledWith({
        phone_number: "+1234567890",
        termination_uri: "https://example.com/webhook",
        sip_trunk_auth_username: "user",
        sip_trunk_auth_password: "pass",
        nickname: "Test Number",
      });
      expect(mocks.mockRetellRepository.updatePhoneNumber).toHaveBeenCalledWith("+1234567890", {
        outbound_agent_id: mockAgent.providerAgentId,
      });
      expect(mocks.mockTransactionManager.executeInTransaction).toHaveBeenCalled();
    });

    it("should validate team permissions when teamId provided", async () => {
      mocks.mockAgentRepository.canManageTeamResources.mockResolvedValue(false);

      await expect(
        service.importPhoneNumber({
          ...validImportData,
          teamId: 1,
        })
      ).rejects.toThrow(HttpError);

      expect(mocks.mockAgentRepository.canManageTeamResources).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
      });
    });

    it("should validate agent permissions when agentId provided", async () => {
      mocks.mockAgentRepository.findByIdWithUserAccess.mockResolvedValue(null);

      await expect(
        service.importPhoneNumber({
          ...validImportData,
          agentId: "invalid-agent",
        })
      ).rejects.toThrow(HttpError);

      expect(mocks.mockAgentRepository.findByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "invalid-agent",
        userId: 1,
      });
    });

    it("should handle transaction rollback with successful cleanup", async () => {
      const mockPhoneNumber = createMockPhoneNumber();
      const mockAgent = createMockDatabaseAgent();

      mocks.mockAgentRepository.findByIdWithUserAccess.mockResolvedValue(mockAgent);
      mocks.mockRetellRepository.importPhoneNumber.mockResolvedValue(mockPhoneNumber);
      mocks.mockRetellRepository.deletePhoneNumber.mockResolvedValue(undefined);

      // Mock database failure
      mocks.mockTransactionManager.executeInTransaction.mockImplementation(async (callback) => {
        const mockContext = {
          phoneNumberRepository: {
            createPhoneNumber: vi.fn().mockRejectedValue(new TestError("Database connection failed")),
          },
        };
        return await callback(mockContext);
      });

      await expect(service.importPhoneNumber(validImportData)).rejects.toThrow("Database connection failed");

      // Verify cleanup was attempted
      expect(mocks.mockRetellRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });

    it("should handle compensation failure and throw critical error", async () => {
      const mockPhoneNumber = createMockPhoneNumber();
      const mockAgent = createMockDatabaseAgent();

      mocks.mockAgentRepository.findByIdWithUserAccess.mockResolvedValue(mockAgent);
      mocks.mockRetellRepository.importPhoneNumber.mockResolvedValue(mockPhoneNumber);

      // Mock both database failure and cleanup failure
      mocks.mockTransactionManager.executeInTransaction.mockImplementation(async (callback) => {
        const mockContext = {
          phoneNumberRepository: {
            createPhoneNumber: vi.fn().mockRejectedValue(new TestError("Database connection failed")),
          },
        };
        return await callback(mockContext);
      });
      mocks.mockRetellRepository.deletePhoneNumber.mockRejectedValue(new TestError("Retell API unavailable"));

      await expect(service.importPhoneNumber(validImportData)).rejects.toThrow(
        "Failed to cleanup Retell phone number +1234567890 after transaction failure. Manual cleanup required."
      );

      expect(mocks.mockRetellRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });
  });

  describe("deletePhoneNumber", () => {
    it("should successfully delete phone number", async () => {
      const mockRecord = createMockPhoneNumberRecord({
        subscriptionStatus: PhoneNumberSubscriptionStatus.PENDING,
      });
      mocks.mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue(mockRecord);

      await service.deletePhoneNumber({
        phoneNumber: "+1234567890",
        userId: 1,
        deleteFromDB: false,
      });

      expect(mocks.mockRetellRepository.updatePhoneNumber).toHaveBeenCalledWith("+1234567890", {
        inbound_agent_id: null,
        outbound_agent_id: null,
      });
      expect(mocks.mockRetellRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });

    it("should throw error if phone number not found", async () => {
      mocks.mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue(null);

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          deleteFromDB: false,
        })
      ).rejects.toThrow(HttpError);
    });

    it("should throw error if phone number is still active", async () => {
      const mockRecord = createMockPhoneNumberRecord({
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      });
      mocks.mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue(mockRecord);

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          deleteFromDB: false,
        })
      ).rejects.toThrow("Phone number is still active");
    });

    it("should handle team-scoped deletion", async () => {
      const mockRecord = createMockPhoneNumberRecord({
        subscriptionStatus: PhoneNumberSubscriptionStatus.PENDING,
      });
      mocks.mockPhoneNumberRepository.findByPhoneNumberAndTeamId.mockResolvedValue(mockRecord);

      await service.deletePhoneNumber({
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: 1,
        deleteFromDB: true,
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumberAndTeamId).toHaveBeenCalledWith({
        phoneNumber: "+1234567890",
        teamId: 1,
        userId: 1,
      });
      expect(mocks.mockPhoneNumberRepository.deletePhoneNumber).toHaveBeenCalledWith({
        phoneNumber: "+1234567890",
      });
    });
  });

  describe("updatePhoneNumberWithAgents", () => {
    it("should successfully update phone number with agents", async () => {
      const mockRecord = createMockPhoneNumberRecord();
      const mockAgent = createMockDatabaseAgent();

      mocks.mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue(mockRecord);
      mocks.mockAgentRepository.findByProviderAgentIdWithUserAccess.mockResolvedValue(mockAgent);
      mocks.mockRetellRepository.getPhoneNumber.mockResolvedValue(createMockPhoneNumber());

      const result = await service.updatePhoneNumberWithAgents({
        phoneNumber: "+1234567890",
        userId: 1,
        inboundAgentId: "inbound-agent-123",
        outboundAgentId: "outbound-agent-123",
      });

      expect(result.message).toBe("Phone number updated successfully");
      expect(mocks.mockPhoneNumberRepository.updateAgents).toHaveBeenCalledWith({
        id: 1,
        inboundProviderAgentId: "inbound-agent-123",
        outboundProviderAgentId: "outbound-agent-123",
      });
    });

    it("should validate agent permissions", async () => {
      const mockRecord = createMockPhoneNumberRecord();

      mocks.mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue(mockRecord);
      mocks.mockAgentRepository.findByProviderAgentIdWithUserAccess.mockResolvedValue(null);

      await expect(
        service.updatePhoneNumberWithAgents({
          phoneNumber: "+1234567890",
          userId: 1,
          inboundAgentId: "invalid-agent",
        })
      ).rejects.toThrow("You don't have permission to use the selected inbound agent");
    });

    it("should handle phone number not found in Retell gracefully", async () => {
      const mockRecord = createMockPhoneNumberRecord();
      const mockAgent = createMockDatabaseAgent();

      mocks.mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue(mockRecord);
      mocks.mockAgentRepository.findByProviderAgentIdWithUserAccess.mockResolvedValue(mockAgent);
      mocks.mockRetellRepository.getPhoneNumber.mockRejectedValue(new TestError("404 Not Found"));

      // Should not throw - should handle gracefully
      const result = await service.updatePhoneNumberWithAgents({
        phoneNumber: "+1234567890",
        userId: 1,
        inboundAgentId: "agent-123",
      });

      expect(result.message).toBe("Phone number updated successfully");
      expect(mocks.mockPhoneNumberRepository.updateAgents).toHaveBeenCalled();
    });
  });

  describe("getPhoneNumber", () => {
    it("should return phone number from Retell", async () => {
      const mockPhoneNumber = createMockPhoneNumber();
      mocks.mockRetellRepository.getPhoneNumber.mockResolvedValue(mockPhoneNumber);

      const result = await service.getPhoneNumber("+1234567890");

      expect(result).toEqual(mockPhoneNumber);
      expect(mocks.mockRetellRepository.getPhoneNumber).toHaveBeenCalledWith("+1234567890");
    });
  });

  describe("updatePhoneNumber", () => {
    it("should update phone number in Retell", async () => {
      const mockPhoneNumber = createMockPhoneNumber();
      mocks.mockRetellRepository.updatePhoneNumber.mockResolvedValue(mockPhoneNumber);

      const result = await service.updatePhoneNumber("+1234567890", {
        inbound_agent_id: "inbound-123",
        outbound_agent_id: "outbound-123",
      });

      expect(result).toEqual(mockPhoneNumber);
      expect(mocks.mockRetellRepository.updatePhoneNumber).toHaveBeenCalledWith("+1234567890", {
        inbound_agent_id: "inbound-123",
        outbound_agent_id: "outbound-123",
      });
    });
  });
});
