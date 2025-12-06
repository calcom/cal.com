import { describe, it, expect, vi, beforeEach } from "vitest";

import { AgentService } from "../AgentService";
import { setupBasicMocks, createMockDatabaseAgent, createMockPhoneNumberRecord } from "./test-utils";

/**
 * Permission tests for AgentService
 * 
 * These tests verify that:
 * 1. Team-scoped operations properly use canManageTeamResources checks
 * 2. findByIdWithAdminAccess enforces permissions for update/delete operations
 * 3. Users cannot act on resources outside their scope
 * 4. Proper dependency injection is used throughout
 * 
 * Note: These tests focus on permission check logic only.
 * Full integration tests are in AgentService.test.ts
 */

const buildService = () => {
  const mocks = setupBasicMocks();
  const service = new AgentService({
    retellRepository: mocks.mockRetellRepository,
    agentRepository: mocks.mockAgentRepository,
    phoneNumberRepository: mocks.mockPhoneNumberRepository,
  });
  return { service, mocks };
};

describe("AgentService - Permission Checks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("createOutboundAgent - Team-scoped permissions", () => {
    it("should deny when canManageTeamResources returns false", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockAgentRepository.canManageTeamResources).mockResolvedValue(false);

      const mockSetupAIConfiguration = vi.fn().mockResolvedValue({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      await expect(
        service.createOutboundAgent({
          name: "Test Agent",
          userId: 1,
          teamId: 42,
          workflowStepId: 1,
          setupAIConfiguration: mockSetupAIConfiguration,
        })
      ).rejects.toThrow("You don't have permission to create agents for this team.");

      expect(mocks.mockAgentRepository.canManageTeamResources).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
      });

      expect(mocks.mockAgentRepository.create).not.toHaveBeenCalled();
      expect(mockSetupAIConfiguration).not.toHaveBeenCalled();
    });

    it("should not check permissions when no teamId is provided", async () => {
      const { service, mocks } = buildService();

      const mockSetupAIConfiguration = vi.fn().mockResolvedValue({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      vi.mocked(mocks.mockAgentRepository.create).mockResolvedValue(
        createMockDatabaseAgent({
          id: "db-agent-123",
          providerAgentId: "agent-123",
          userId: 1,
          teamId: null,
        })
      );

      await service.createOutboundAgent({
        name: "Test Agent",
        userId: 1,
        setupAIConfiguration: mockSetupAIConfiguration,
      });

      expect(mocks.mockAgentRepository.canManageTeamResources).not.toHaveBeenCalled();

      expect(mockSetupAIConfiguration).toHaveBeenCalled();
      expect(mocks.mockAgentRepository.create).toHaveBeenCalled();
    });
  });

  describe("updateAgentConfiguration - Admin access permissions", () => {
    it("should deny when findByIdWithAdminAccess returns null", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockAgentRepository.findByIdWithAdminAccess).mockResolvedValue(null);

      const mockUpdateLLMConfiguration = vi.fn();

      await expect(
        service.updateAgentConfiguration({
          id: "agent-123",
          userId: 1,
          teamId: 42,
          name: "Updated Agent",
          generalPrompt: "New prompt",
          updateLLMConfiguration: mockUpdateLLMConfiguration,
        })
      ).rejects.toThrow("Agent not found or you don't have permission to update it.");

      expect(mocks.mockAgentRepository.findByIdWithAdminAccess).toHaveBeenCalledWith({
        id: "agent-123",
        userId: 1,
        teamId: 42,
      });

      expect(mockUpdateLLMConfiguration).not.toHaveBeenCalled();
      expect(mocks.mockRetellRepository.getAgent).not.toHaveBeenCalled();
    });
  });

  describe("deleteAgent - Admin access permissions", () => {
    it("should deny when findByIdWithAdminAccess returns null", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockAgentRepository.findByIdWithAdminAccess).mockResolvedValue(null);

      const mockDeleteAIConfiguration = vi.fn();

      await expect(
        service.deleteAgent({
          id: "agent-123",
          userId: 1,
          teamId: 42,
          deleteAIConfiguration: mockDeleteAIConfiguration,
        })
      ).rejects.toThrow("Agent not found or you don't have permission to delete it.");

      expect(mocks.mockAgentRepository.findByIdWithAdminAccess).toHaveBeenCalledWith({
        id: "agent-123",
        userId: 1,
        teamId: 42,
      });

      expect(mockDeleteAIConfiguration).not.toHaveBeenCalled();
      expect(mocks.mockAgentRepository.delete).not.toHaveBeenCalled();
      expect(mocks.mockRetellRepository.getAgent).not.toHaveBeenCalled();
    });
  });

  describe("createInboundAgent - Team phone number ownership", () => {
    it("should deny when phone number does not belong to the team", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockAgentRepository.canManageTeamResources).mockResolvedValue(true);

      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+12025550123",
          userId: 1,
          teamId: 999, // Different team
          inboundAgentId: null,
        })
      );

      const mockAIConfigurationService = {
        setupInboundAIConfiguration: vi.fn().mockResolvedValue({
          llmId: "llm-123",
          agentId: "agent-123",
        }),
      };

      await expect(
        service.createInboundAgent({
          name: "Test Inbound Agent",
          phoneNumber: "+12025550123",
          userId: 1,
          teamId: 42,
          workflowStepId: 1,
          aiConfigurationService: mockAIConfigurationService,
        })
      ).rejects.toThrow("Insufficient permission to create inbound agents for this phone number.");

      expect(mocks.mockAgentRepository.canManageTeamResources).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumber).toHaveBeenCalledWith("+12025550123");

      expect(mockAIConfigurationService.setupInboundAIConfiguration).not.toHaveBeenCalled();
      expect(mocks.mockAgentRepository.create).not.toHaveBeenCalled();
    });
  });
});
