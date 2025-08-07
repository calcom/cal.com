import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type { AgentRepositoryInterface } from "../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../interfaces/TransactionInterface";
import { RetellAIService } from "./RetellAIService";
import { RetellAIError } from "./errors";
import type { RetellAIRepository } from "./types";

vi.mock("@calcom/lib/server/repository/PrismaPhoneNumberRepository", () => ({
  PrismaPhoneNumberRepository: {
    createPhoneNumber: vi.fn(),
    findByPhoneNumberAndUserId: vi.fn(),
    deletePhoneNumber: vi.fn(),
    updateAgents: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
    findByIdAndUserId: vi.fn(),
  },
}));
vi.mock("@calcom/lib/server/repository/PrismaAgentRepository", () => ({
  PrismaAgentRepository: {
    findByIdWithUserAccess: vi.fn(),
    findByProviderAgentIdWithUserAccess: vi.fn(),
    findManyWithUserAccess: vi.fn(),
    findByIdWithUserAccessAndDetails: vi.fn(),
    canManageTeamResources: vi.fn(),
    create: vi.fn(),
    linkToWorkflowStep: vi.fn(),
    findByIdWithAdminAccess: vi.fn(),
    delete: vi.fn(),
    findByIdWithCallAccess: vi.fn(),
  },
}));

vi.mock("@calcom/app-store/stripepayment/lib/customer", () => ({
  getStripeCustomerIdFromUserId: vi.fn(),
}));

vi.mock("@calcom/app-store/stripepayment/lib/utils", () => ({
  getPhoneNumberMonthlyPriceId: vi.fn(),
}));

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      cancel: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: vi.fn().mockImplementation(() => ({
    getAllCredits: vi.fn(),
  })),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
}));

// Mock Prisma client with transaction support
vi.mock("@calcom/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    calAiPhoneNumber: {
      create: vi.fn(),
    },
  },
}));

describe("RetellAIService", () => {
  let service: RetellAIService;
  let mockRepository: RetellAIRepository & { [K in keyof RetellAIRepository]: vi.Mock };
  let mockAgentRepository: AgentRepositoryInterface;
  let mockPhoneNumberRepository: PhoneNumberRepositoryInterface;
  let mockTransactionManager: TransactionInterface;
  let mockTransaction: vi.Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const repository = {
      createLLM: vi.fn(),
      getLLM: vi.fn(),
      updateLLM: vi.fn(),
      deleteLLM: vi.fn(),
      createAgent: vi.fn(),
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      createPhoneNumber: vi.fn(),
      importPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      getPhoneNumber: vi.fn(),
      updatePhoneNumber: vi.fn(),
      createPhoneCall: vi.fn(),
    };
    mockRepository = repository as unknown as RetellAIRepository;

    // Mock agent repository
    const agentRepository = {
      canManageTeamResources: vi.fn(),
      findByIdWithUserAccess: vi.fn(),
      findByProviderAgentIdWithUserAccess: vi.fn(),
      findManyWithUserAccess: vi.fn(),
      findByIdWithUserAccessAndDetails: vi.fn(),
      create: vi.fn(),
      findByIdWithAdminAccess: vi.fn(),
      findByIdWithCallAccess: vi.fn(),
      delete: vi.fn(),
      linkToWorkflowStep: vi.fn(),
    };
    mockAgentRepository = agentRepository as unknown as AgentRepositoryInterface;

    // Mock phone number repository
    const phoneNumberRepository = {
      findByPhoneNumberAndUserId: vi.fn(),
      findByPhoneNumberAndTeamId: vi.fn(),
      findByIdAndUserId: vi.fn(),
      findByIdWithTeamAccess: vi.fn(),
      createPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
      updateAgents: vi.fn(),
    };
    mockPhoneNumberRepository = phoneNumberRepository as unknown as PhoneNumberRepositoryInterface;

    // Mock transaction manager
    const transactionManager = {
      executeInTransaction: vi.fn(),
    };
    mockTransactionManager = transactionManager as unknown as TransactionInterface;

    // Get reference to the mocked prisma and its transaction method
    const prisma = (await import("@calcom/prisma")).default;
    mockTransaction = prisma.$transaction as vi.Mock;

    // Reset transaction mock to simulate successful transaction by default
    mockTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        calAiPhoneNumber: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(mockTx);
    });

    // Mock transaction manager to call the callback directly
    mockTransactionManager.executeInTransaction.mockImplementation(async (callback) => {
      const mockContext = {
        phoneNumberRepository: {
          createPhoneNumber: vi.fn().mockResolvedValue({}),
        },
      };
      return await callback(mockContext);
    });

    service = new RetellAIService(
      mockRepository,
      mockAgentRepository,
      mockPhoneNumberRepository,
      mockTransactionManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("setupAIConfiguration", () => {
    it("should create LLM and agent with minimal configuration", async () => {
      const mockLLM = { llm_id: "llm-123" };
      const mockAgent = { agent_id: "agent-123" };
      mockRepository.createLLM.mockResolvedValue(mockLLM);
      mockRepository.createAgent.mockResolvedValue(mockAgent);

      const result = await service.setupAIConfiguration({});

      expect(result).toEqual({ llmId: "llm-123", agentId: "agent-123" });
      expect(mockRepository.createLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          general_tools: expect.arrayContaining([
            {
              type: "end_call",
              name: "end_call",
              description: expect.any(String),
            },
          ]),
        })
      );
    });

    it("should include Cal.com tools when API key and eventTypeId are provided", async () => {
      const mockLLM = { llm_id: "llm-123" };
      const mockAgent = { agent_id: "agent-123" };

      mockRepository.createLLM.mockResolvedValue(mockLLM);
      mockRepository.createAgent.mockResolvedValue(mockAgent);

      await service.setupAIConfiguration({
        calApiKey: "cal-key",
        eventTypeId: 123,
        timeZone: "UTC",
      });

      expect(mockRepository.createLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          general_tools: expect.arrayContaining([
            expect.objectContaining({ type: "check_availability_cal" }),
            expect.objectContaining({ type: "book_appointment_cal" }),
          ]),
        })
      );
    });
  });

  describe("deleteAIConfiguration", () => {
    it("should handle successful deletion of both LLM and agent", async () => {
      mockRepository.deleteAgent.mockResolvedValue(undefined);
      mockRepository.deleteLLM.mockResolvedValue(undefined);

      const result = await service.deleteAIConfiguration({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      expect(result).toEqual({
        success: true,
        errors: [],
        deleted: { llm: true, agent: true },
      });
    });

    it("should handle 404 errors gracefully", async () => {
      mockRepository.deleteAgent.mockRejectedValue(new RetellAIError("Agent not found", "deleteAgent"));
      mockRepository.deleteLLM.mockRejectedValue(new RetellAIError("LLM not found", "deleteLLM"));

      const result = await service.deleteAIConfiguration({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      expect(result).toEqual({
        success: false,
        errors: ["Agent not found", "LLM not found"],
        deleted: { llm: false, agent: false },
      });
    });

    it("should handle partial deletion failure", async () => {
      mockRepository.deleteAgent.mockResolvedValue(undefined);
      mockRepository.deleteLLM.mockRejectedValue(new Error("Network error"));

      const result = await service.deleteAIConfiguration({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      expect(result).toEqual({
        success: false,
        errors: ["Network error"],
        deleted: { llm: false, agent: true },
      });
    });
  });

  describe("deletePhoneNumber", () => {
    it("should throw error if phone number is active", async () => {
      mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue({
        id: 1,
        phoneNumber: "+1234567890",
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        userId: 1,
        teamId: null,
        provider: null,
        inboundAgentId: null,
        outboundAgentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          deleteFromDB: true,
        })
      ).rejects.toThrow("Phone number is still active");
    });

    it("should throw error if phone number is cancelled", async () => {
      mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue({
        id: 1,
        phoneNumber: "+1234567890",
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        userId: 1,
        teamId: null,
        provider: null,
        inboundAgentId: null,
        outboundAgentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          deleteFromDB: true,
        })
      ).rejects.toThrow("Phone number is already cancelled");
    });

    it("should delete from both DB and provider when deleteFromDB is true", async () => {
      mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue({
        id: 1,
        phoneNumber: "+1234567890",
        subscriptionStatus: PhoneNumberSubscriptionStatus.INCOMPLETE,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        userId: 1,
        teamId: null,
        provider: null,
        inboundAgentId: null,
        outboundAgentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.deletePhoneNumber({
        phoneNumber: "+1234567890",
        userId: 1,
        deleteFromDB: true,
      });

      expect(mockPhoneNumberRepository.deletePhoneNumber).toHaveBeenCalledWith({
        phoneNumber: "+1234567890",
      });
      expect(mockRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });
  });

  describe("importPhoneNumber", () => {
    it("should import phone number and create DB record using transaction", async () => {
      const mockImportedNumber = { phone_number: "+1234567890" };
      mockRepository.importPhoneNumber.mockResolvedValue(mockImportedNumber);

      const result = await service.importPhoneNumber({
        phone_number: "+1234567890",
        termination_uri: "https://example.com",
        sip_trunk_auth_username: "user",
        sip_trunk_auth_password: "pass",
        userId: 1,
      });

      expect(result).toEqual(mockImportedNumber);
      expect(mockTransactionManager.executeInTransaction).toHaveBeenCalled();
      expect(mockRepository.importPhoneNumber).toHaveBeenCalledWith({
        phone_number: "+1234567890",
        termination_uri: "https://example.com",
        sip_trunk_auth_username: "user",
        sip_trunk_auth_password: "pass",
        nickname: undefined,
      });
    });

    it("should import phone number and assign to agent if agentId provided", async () => {
      const mockImportedNumber = { phone_number: "+1234567890" };
      mockRepository.importPhoneNumber.mockResolvedValue(mockImportedNumber);

      mockAgentRepository.findByIdWithUserAccess.mockResolvedValue({
        id: "agent-123",
        name: "Test Agent",
        providerAgentId: "retell-agent-456",
        enabled: true,
        userId: 1,
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.importPhoneNumber({
        phone_number: "+1234567890",
        termination_uri: "https://example.com",
        sip_trunk_auth_username: "user",
        sip_trunk_auth_password: "pass",
        userId: 1,
        agentId: "agent-123",
      });

      expect(result).toEqual(mockImportedNumber);
      expect(mockAgentRepository.findByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "agent-123",
        userId: 1,
      });
      expect(mockTransactionManager.executeInTransaction).toHaveBeenCalled();
      expect(mockRepository.updatePhoneNumber).toHaveBeenCalledWith("+1234567890", {
        outbound_agent_id: "retell-agent-456",
      });
    });

    it("should throw error when agent not found during import", async () => {
      mockAgentRepository.findByIdWithUserAccess.mockResolvedValue(null);

      await expect(
        service.importPhoneNumber({
          phone_number: "+1234567890",
          termination_uri: "https://example.com",
          userId: 1,
          agentId: "invalid-agent",
        })
      ).rejects.toThrow("You don't have permission to use the selected agent.");

      // Verify that the agent permission check was called
      expect(mockAgentRepository.findByIdWithUserAccess).toHaveBeenCalledWith({
        agentId: "invalid-agent",
        userId: 1,
      });

      // Verify that no repository operations were called after the error
      expect(mockRepository.importPhoneNumber).not.toHaveBeenCalled();
      expect(mockTransactionManager.executeInTransaction).not.toHaveBeenCalled();
    });

    it("should handle transaction rollback when database creation fails with successful cleanup", async () => {
      const mockImportedNumber = { phone_number: "+1234567890" };
      mockRepository.importPhoneNumber.mockResolvedValue(mockImportedNumber);
      mockRepository.deletePhoneNumber.mockResolvedValue(undefined);

      // Mock transaction manager to simulate database creation failure
      mockTransactionManager.executeInTransaction.mockImplementation(async (callback) => {
        const mockContext = {
          phoneNumberRepository: {
            createPhoneNumber: vi.fn().mockRejectedValue(new Error("Database connection failed")),
          },
        };
        return await callback(mockContext);
      });

      await expect(
        service.importPhoneNumber({
          phone_number: "+1234567890",
          termination_uri: "https://example.com",
          sip_trunk_auth_username: "user",
          sip_trunk_auth_password: "pass",
          userId: 1,
        })
      ).rejects.toThrow("Database connection failed");

      // Verify that the phone number was imported from Retell
      expect(mockRepository.importPhoneNumber).toHaveBeenCalled();

      // Verify that cleanup was attempted and succeeded
      expect(mockRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });

    it("should handle compensation failure and throw critical error", async () => {
      const mockImportedNumber = { phone_number: "+1234567890" };
      mockRepository.importPhoneNumber.mockResolvedValue(mockImportedNumber);

      // Mock compensation failure
      mockRepository.deletePhoneNumber.mockRejectedValue(new Error("Retell API unavailable"));

      // Mock transaction manager to simulate database creation failure
      mockTransactionManager.executeInTransaction.mockImplementation(async (callback) => {
        const mockContext = {
          phoneNumberRepository: {
            createPhoneNumber: vi.fn().mockRejectedValue(new Error("Database connection failed")),
          },
        };
        return await callback(mockContext);
      });

      await expect(
        service.importPhoneNumber({
          phone_number: "+1234567890",
          termination_uri: "https://example.com",
          sip_trunk_auth_username: "user",
          sip_trunk_auth_password: "pass",
          userId: 1,
        })
      ).rejects.toThrow(
        "Failed to cleanup Retell phone number +1234567890 after transaction failure. Manual cleanup required."
      );

      // Verify both operations were attempted
      expect(mockRepository.importPhoneNumber).toHaveBeenCalled();
      expect(mockRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });
  });

  describe("createPhoneCall", () => {
    it("should create phone call with dynamic variables", async () => {
      const mockCall = { call_id: "call-123" };
      mockRepository.createPhoneCall.mockResolvedValue(mockCall);

      const result = await service.createPhoneCall({
        from_number: "+1234567890",
        to_number: "+0987654321",
        retell_llm_dynamic_variables: {
          name: "John",
          email: "john@example.com",
        },
      });

      expect(result).toEqual(mockCall);
      expect(mockRepository.createPhoneCall).toHaveBeenCalledWith({
        from_number: "+1234567890",
        to_number: "+0987654321",
        retell_llm_dynamic_variables: {
          name: "John",
          email: "john@example.com",
        },
      });
    });
  });

  describe("updateLLMConfiguration", () => {
    it("should update LLM configuration", async () => {
      const mockUpdatedLLM = { llm_id: "llm-123", general_prompt: "Updated prompt" };
      mockRepository.updateLLM.mockResolvedValue(mockUpdatedLLM);

      const result = await service.updateLLMConfiguration("llm-123", {
        general_prompt: "Updated prompt",
        begin_message: "Updated message",
      });

      expect(result).toEqual(mockUpdatedLLM);
      expect(mockRepository.updateLLM).toHaveBeenCalledWith("llm-123", {
        general_prompt: "Updated prompt",
        begin_message: "Updated message",
        general_tools: null,
      });
    });
  });

  describe("getLLMDetails", () => {
    it("should get LLM details", async () => {
      const mockLLM = { llm_id: "llm-123", general_prompt: "Test prompt" };
      mockRepository.getLLM.mockResolvedValue(mockLLM);

      const result = await service.getLLMDetails("llm-123");

      expect(result).toEqual(mockLLM);
      expect(mockRepository.getLLM).toHaveBeenCalledWith("llm-123");
    });
  });

  describe("getAgent", () => {
    it("should get agent details", async () => {
      const mockAgent = { agent_id: "agent-123", agent_name: "Test Agent" };
      mockRepository.getAgent.mockResolvedValue(mockAgent);

      const result = await service.getAgent("agent-123");

      expect(result).toEqual(mockAgent);
      expect(mockRepository.getAgent).toHaveBeenCalledWith("agent-123");
    });
  });

  describe("updateAgent", () => {
    it("should update agent", async () => {
      const mockUpdatedAgent = { agent_id: "agent-123", agent_name: "Updated Agent" };
      mockRepository.updateAgent.mockResolvedValue(mockUpdatedAgent);

      const result = await service.updateAgent("agent-123", {
        agent_name: "Updated Agent",
        voice_id: "new-voice",
      });

      expect(result).toEqual(mockUpdatedAgent);
      expect(mockRepository.updateAgent).toHaveBeenCalledWith("agent-123", {
        agent_name: "Updated Agent",
        voice_id: "new-voice",
      });
    });
  });

  describe("createPhoneNumber", () => {
    it("should create phone number", async () => {
      const mockPhoneNumber = { phone_number: "+14155551234" };
      mockRepository.createPhoneNumber.mockResolvedValue(mockPhoneNumber);

      const result = await service.createPhoneNumber({
        area_code: 415,
        nickname: "Test Phone",
      });

      expect(result).toEqual(mockPhoneNumber);
      expect(mockRepository.createPhoneNumber).toHaveBeenCalledWith({
        area_code: 415,
        nickname: "Test Phone",
      });
    });
  });

  describe("getPhoneNumber", () => {
    it("should get phone number", async () => {
      const mockPhoneNumber = { phone_number: "+14155551234" };
      mockRepository.getPhoneNumber.mockResolvedValue(mockPhoneNumber);

      const result = await service.getPhoneNumber("+14155551234");

      expect(result).toEqual(mockPhoneNumber);
      expect(mockRepository.getPhoneNumber).toHaveBeenCalledWith("+14155551234");
    });
  });

  describe("updatePhoneNumber", () => {
    it("should update phone number", async () => {
      const mockUpdatedNumber = { phone_number: "+14155551234" };
      mockRepository.updatePhoneNumber.mockResolvedValue(mockUpdatedNumber);

      const result = await service.updatePhoneNumber("+14155551234", {
        inbound_agent_id: "inbound-123",
        outbound_agent_id: "outbound-123",
      });

      expect(result).toEqual(mockUpdatedNumber);
      expect(mockRepository.updatePhoneNumber).toHaveBeenCalledWith("+14155551234", {
        inbound_agent_id: "inbound-123",
        outbound_agent_id: "outbound-123",
      });
    });
  });

  describe("generatePhoneNumberCheckoutSession", () => {
    it("should generate checkout session successfully", async () => {
      const { getStripeCustomerIdFromUserId } = await import("@calcom/app-store/stripepayment/lib/customer");
      const { getPhoneNumberMonthlyPriceId } = await import("@calcom/app-store/stripepayment/lib/utils");
      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;

      (getPhoneNumberMonthlyPriceId as any).mockReturnValue("price_123");
      (getStripeCustomerIdFromUserId as any).mockResolvedValue("cus_123");
      (stripe.checkout.sessions.create as any).mockResolvedValue({
        url: "https://checkout.stripe.com/session",
      });

      const result = await service.generatePhoneNumberCheckoutSession({
        userId: 1,
        teamId: 2,
        agentId: "agent-123",
      });

      expect(result).toEqual({
        url: "https://checkout.stripe.com/session",
        message: "Payment required to purchase phone number",
      });
    });

    it("should throw error if price ID not configured", async () => {
      const { getPhoneNumberMonthlyPriceId } = await import("@calcom/app-store/stripepayment/lib/utils");
      (getPhoneNumberMonthlyPriceId as any).mockReturnValue(null);

      await expect(
        service.generatePhoneNumberCheckoutSession({
          userId: 1,
        })
      ).rejects.toThrow("Phone number price ID not configured");
    });
  });

  describe("cancelPhoneNumberSubscription", () => {
    it("should cancel subscription successfully", async () => {
      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;

      mockPhoneNumberRepository.findByIdAndUserId.mockResolvedValue({
        id: 1,
        phoneNumber: "+14155551234",
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: null,
        subscriptionStatus: null,
        userId: 1,
        teamId: null,
        provider: null,
        inboundAgentId: null,
        outboundAgentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (stripe.subscriptions.cancel as any).mockResolvedValue({});

      const result = await service.cancelPhoneNumberSubscription({
        phoneNumberId: 1,
        userId: 1,
      });

      expect(result).toEqual({
        success: true,
        message: "Phone number subscription cancelled successfully.",
      });
      expect(mockPhoneNumberRepository.updateSubscriptionStatus).toHaveBeenCalledWith({
        id: 1,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectOutboundAgent: true,
      });
    });
  });

  describe("updatePhoneNumberWithAgents", () => {
    it("should update phone number with agents", async () => {
      mockPhoneNumberRepository.findByPhoneNumberAndUserId.mockResolvedValue({
        id: 1,
        phoneNumber: "+14155551234",
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        subscriptionStatus: null,
        userId: 1,
        teamId: null,
        provider: null,
        inboundAgentId: null,
        outboundAgentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAgentRepository.findByProviderAgentIdWithUserAccess.mockResolvedValue({
        id: "agent-123",
        name: "Test Agent",
        providerAgentId: "retell-agent-456",
        enabled: true,
        userId: 1,
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepository.getPhoneNumber.mockResolvedValue({ phone_number: "+14155551234" });

      const result = await service.updatePhoneNumberWithAgents({
        phoneNumber: "+14155551234",
        userId: 1,
        inboundAgentId: "inbound-123",
        outboundAgentId: "outbound-123",
      });

      expect(result).toEqual({ message: "Phone number updated successfully" });
      expect(mockRepository.updatePhoneNumber).toHaveBeenCalled();
      expect(mockPhoneNumberRepository.updateAgents).toHaveBeenCalled();
    });
  });

  describe("listAgents", () => {
    it("should list agents with user access", async () => {
      const mockAgents = [
        {
          id: "1",
          name: "Agent 1",
          providerAgentId: "retell-1",
          enabled: true,
          userId: 1,
          teamId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 1, name: "Test User", email: "test@example.com" },
          team: null,
          outboundPhoneNumbers: [],
        },
      ];

      mockAgentRepository.findManyWithUserAccess.mockResolvedValue(mockAgents);

      const result = await service.listAgents({
        userId: 1,
        scope: "all",
      });

      expect(result.totalCount).toBe(1);
      expect(result.filtered).toHaveLength(1);
      expect(mockAgentRepository.findManyWithUserAccess).toHaveBeenCalledWith({
        userId: 1,
        teamId: undefined,
        scope: "all",
      });
    });
  });

  describe("createAgent", () => {
    it("should create agent successfully", async () => {
      mockRepository.createLLM.mockResolvedValue({ llm_id: "llm-123" });
      mockRepository.createAgent.mockResolvedValue({ agent_id: "agent-123" });
      mockAgentRepository.create.mockResolvedValue({
        id: "db-agent-123",
        name: "Test Agent",
        providerAgentId: "agent-123",
        enabled: true,
        userId: 1,
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createAgent({
        name: "Test Agent",
        userId: 1,
        userTimeZone: "America/New_York",
      });

      expect(result).toEqual({
        id: "db-agent-123",
        providerAgentId: "agent-123",
        message: "Agent created successfully",
      });
    });
  });

  describe("deleteAgent", () => {
    it("should delete agent successfully", async () => {
      mockAgentRepository.findByIdWithAdminAccess.mockResolvedValue({
        id: "1",
        name: "Test Agent",
        providerAgentId: "agent-123",
        enabled: true,
        userId: 1,
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepository.getAgent.mockResolvedValue({
        agent_id: "agent-123",
        response_engine: { type: "retell-llm", llm_id: "llm-123" },
      });

      const result = await service.deleteAgent({
        id: "1",
        userId: 1,
      });

      expect(result).toEqual({ message: "Agent deleted successfully" });
      expect(mockAgentRepository.delete).toHaveBeenCalledWith({ id: "1" });
    });
  });

  describe("createTestCall", () => {
    it("should create test call successfully with sufficient credits", async () => {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const { checkRateLimitAndThrowError } = await import("@calcom/lib/checkRateLimitAndThrowError");

      // Mock credit service to return sufficient credits
      const mockGetAllCredits = vi.fn().mockResolvedValue({
        totalRemainingMonthlyCredits: 10,
        additionalCredits: 5,
      });
      (CreditService as any).mockImplementation(() => ({
        getAllCredits: mockGetAllCredits,
      }));

      (checkRateLimitAndThrowError as any).mockResolvedValue(undefined);
      mockAgentRepository.findByIdWithCallAccess.mockResolvedValue({
        id: "1",
        name: "Test Agent",
        providerAgentId: "agent-123",
        enabled: true,
        userId: 1,
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        outboundPhoneNumbers: [{ phoneNumber: "+14155551234" }],
      });
      mockRepository.createPhoneCall.mockResolvedValue({
        call_id: "call-123",
        call_status: "initiated",
      });

      const result = await service.createTestCall({
        agentId: "1",
        phoneNumber: "+14155555678",
        userId: 1,
        teamId: 2,
      });

      expect(mockGetAllCredits).toHaveBeenCalledWith({
        userId: 1,
        teamId: 2,
      });
      expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
        rateLimitingType: "core",
        identifier: "test-call:1",
      });
      expect(result).toEqual({
        callId: "call-123",
        status: "initiated",
        message: "Call initiated to +14155555678 with call_id call-123",
      });
    });

    it("should throw error if insufficient credits", async () => {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");

      // Mock credit service to return insufficient credits
      const mockGetAllCredits = vi.fn().mockResolvedValue({
        totalRemainingMonthlyCredits: 2,
        additionalCredits: 1,
      });
      (CreditService as any).mockImplementation(() => ({
        getAllCredits: mockGetAllCredits,
      }));

      await expect(
        service.createTestCall({
          agentId: "1",
          phoneNumber: "+14155555678",
          userId: 1,
        })
      ).rejects.toThrow(
        "Insufficient credits to make test call. Need 5 credits, have 3. Please purchase more credits."
      );

      expect(mockGetAllCredits).toHaveBeenCalledWith({
        userId: 1,
        teamId: undefined,
      });
    });

    it("should handle null/undefined credits gracefully", async () => {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");

      // Mock credit service to return null credits
      const mockGetAllCredits = vi.fn().mockResolvedValue(null);
      (CreditService as any).mockImplementation(() => ({
        getAllCredits: mockGetAllCredits,
      }));

      await expect(
        service.createTestCall({
          agentId: "1",
          phoneNumber: "+14155555678",
          userId: 1,
        })
      ).rejects.toThrow(
        "Insufficient credits to make test call. Need 5 credits, have 0. Please purchase more credits."
      );
    });

    it("should throw error if no phone number provided", async () => {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const { checkRateLimitAndThrowError } = await import("@calcom/lib/checkRateLimitAndThrowError");

      // Mock sufficient credits to get past credit check
      const mockGetAllCredits = vi.fn().mockResolvedValue({
        totalRemainingMonthlyCredits: 10,
        additionalCredits: 0,
      });
      (CreditService as any).mockImplementation(() => ({
        getAllCredits: mockGetAllCredits,
      }));

      (checkRateLimitAndThrowError as any).mockResolvedValue(undefined);

      await expect(
        service.createTestCall({
          agentId: "1",
          userId: 1,
        })
      ).rejects.toThrow("Phone number is required for test call");
    });

    it("should throw error if agent not found", async () => {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const { checkRateLimitAndThrowError } = await import("@calcom/lib/checkRateLimitAndThrowError");
      const { PrismaAgentRepository } = await import("@calcom/lib/server/repository/PrismaAgentRepository");

      // Mock sufficient credits
      const mockGetAllCredits = vi.fn().mockResolvedValue({
        totalRemainingMonthlyCredits: 10,
        additionalCredits: 0,
      });
      (CreditService as any).mockImplementation(() => ({
        getAllCredits: mockGetAllCredits,
      }));

      (checkRateLimitAndThrowError as any).mockResolvedValue(undefined);
      (PrismaAgentRepository.findByIdWithCallAccess as any).mockResolvedValue(null);

      await expect(
        service.createTestCall({
          agentId: "1",
          phoneNumber: "+14155555678",
          userId: 1,
        })
      ).rejects.toThrow("Agent not found or you don't have permission to use it.");
    });

    it("should throw error if agent has no phone numbers", async () => {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const { checkRateLimitAndThrowError } = await import("@calcom/lib/checkRateLimitAndThrowError");

      // Mock sufficient credits
      const mockGetAllCredits = vi.fn().mockResolvedValue({
        totalRemainingMonthlyCredits: 10,
        additionalCredits: 0,
      });
      (CreditService as any).mockImplementation(() => ({
        getAllCredits: mockGetAllCredits,
      }));

      (checkRateLimitAndThrowError as any).mockResolvedValue(undefined);
      mockAgentRepository.findByIdWithCallAccess.mockResolvedValue({
        id: "1",
        name: "Test Agent",
        providerAgentId: "agent-123",
        enabled: true,
        userId: 1,
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        outboundPhoneNumbers: [],
      });

      await expect(
        service.createTestCall({
          agentId: "1",
          phoneNumber: "+14155555678",
          userId: 1,
        })
      ).rejects.toThrow("Agent must have a phone number assigned to make calls.");
    });
  });
});
