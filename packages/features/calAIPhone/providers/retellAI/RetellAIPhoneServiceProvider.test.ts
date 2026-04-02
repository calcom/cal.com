import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AIPhoneServiceCallData,
  AIPhoneServiceConfiguration,
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceDeletion,
  AIPhoneServiceImportPhoneNumberParams,
  AIPhoneServiceUpdateAgentParams,
  AIPhoneServiceUpdateModelParams,
  AIPhoneServiceUpdatePhoneNumberParams,
} from "../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../interfaces/TransactionInterface";
import { RetellAIPhoneServiceProvider } from "./RetellAIPhoneServiceProvider";
import type { RetellAIService } from "./RetellAIService";
import type { RetellAIRepository } from "./types";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

function createMockRetellAIService(overrides: Partial<RetellAIService> = {}): RetellAIService {
  const defaultMocks = {
    setupAIConfiguration: vi.fn(),
    deleteAIConfiguration: vi.fn(),
    updateLLMConfiguration: vi.fn(),
    getLLMDetails: vi.fn(),
    getAgent: vi.fn(),
    updateAgent: vi.fn(),
    createPhoneCall: vi.fn(),
    createPhoneNumber: vi.fn(),
    importPhoneNumber: vi.fn(),
    deletePhoneNumber: vi.fn(),
    getPhoneNumber: vi.fn(),
    updatePhoneNumber: vi.fn(),
    generatePhoneNumberCheckoutSession: vi.fn(),
    cancelPhoneNumberSubscription: vi.fn(),
    updatePhoneNumberWithAgents: vi.fn(),
    listAgents: vi.fn(),
    getAgentWithDetails: vi.fn(),
    createOutboundAgent: vi.fn(),
    updateAgentConfiguration: vi.fn(),
    deleteAgent: vi.fn(),
    createTestCall: vi.fn(),
  };

  return { ...defaultMocks, ...overrides } as unknown as RetellAIService;
}

describe("RetellAIPhoneServiceProvider", () => {
  let mockRepository: RetellAIRepository;
  let mockAgentRepository: AgentRepositoryInterface;
  let mockPhoneNumberRepository: PhoneNumberRepositoryInterface;
  let mockTransactionManager: TransactionInterface;
  let provider: RetellAIPhoneServiceProvider;
  let mockService: RetellAIService;

  beforeEach(() => {
    mockRepository = {
      createLLM: vi.fn().mockResolvedValue({ llm_id: "test-llm-id" }),
      getLLM: vi.fn().mockResolvedValue({ llm_id: "test-llm-id", general_prompt: "test prompt" }),
      updateLLM: vi.fn().mockResolvedValue({ llm_id: "test-llm-id" }),
      deleteLLM: vi.fn().mockResolvedValue(undefined),

      // Agent operations
      createOutboundAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id" }),
      getAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id", agent_name: "Test Agent" }),
      updateAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id" }),
      deleteAgent: vi.fn().mockResolvedValue(undefined),

      // Phone number operations
      createPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890", provider: "retellAI" }),
      importPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      deletePhoneNumber: vi.fn().mockResolvedValue(undefined),
      getPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      updatePhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),

      // Call operations
      createPhoneCall: vi.fn().mockResolvedValue({ call_id: "test-call-id" }),
    };

    // Mock agent repository
    mockAgentRepository = {
      canManageTeamResources: vi.fn(),
      findByIdWithUserAccess: vi.fn(),
      findByProviderAgentIdWithUserAccess: vi.fn(),
      findManyWithUserAccess: vi.fn(),
      findByIdWithUserAccessAndDetails: vi.fn(),
      create: vi.fn(),
      findByIdWithAdminAccess: vi.fn(),
      findByIdWithCallAccess: vi.fn(),
      delete: vi.fn(),
      linkOutboundAgentToWorkflow: vi.fn(),
    } as unknown as AgentRepositoryInterface;

    // Mock phone number repository
    mockPhoneNumberRepository = {
      findByPhoneNumberAndUserId: vi.fn(),
      findByPhoneNumberAndTeamId: vi.fn(),
      findByIdAndUserId: vi.fn(),
      findByIdWithTeamAccess: vi.fn(),
      createPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
      updateAgents: vi.fn(),
    } as unknown as PhoneNumberRepositoryInterface;

    // Mock transaction manager
    mockTransactionManager = {
      executeInTransaction: vi.fn(),
    } as unknown as TransactionInterface;

    // Create a comprehensive mock service using helper function
    mockService = createMockRetellAIService();

    // Pass the mock service as the 5th parameter to ensure it's used instead of creating a new one
    provider = new RetellAIPhoneServiceProvider(
      mockRepository,
      mockAgentRepository,
      mockPhoneNumberRepository,
      mockTransactionManager,
      mockService
    );
  });

  describe("setupConfiguration", () => {
    beforeEach(() => {
      mockService.setupAIConfiguration = vi.fn().mockResolvedValue({
        llmId: "test-llm-id",
        agentId: "test-agent-id",
      });
    });

    it("should setup AI configuration and return llmId and agentId", async () => {
      const config: AIPhoneServiceConfiguration = {
        calApiKey: "test-cal-api-key",
        timeZone: "America/New_York",
        eventTypeId: 123,
        generalPrompt: "Test prompt",
        beginMessage: "Hello!",
        generalTools: [
          {
            type: "check_availability_cal",
            name: "check_availability",
            cal_api_key: "test-key",
            event_type_id: 123,
            timezone: "America/New_York",
          },
        ],
      };

      const result = await provider.setupConfiguration(config);

      expect(mockService.setupAIConfiguration).toHaveBeenCalledWith({
        calApiKey: config.calApiKey,
        timeZone: config.timeZone,
        eventTypeId: config.eventTypeId,
        generalPrompt: config.generalPrompt,
        beginMessage: config.beginMessage,
        generalTools: config.generalTools,
      });

      expect(result).toEqual({
        modelId: "test-llm-id",
        agentId: "test-agent-id",
      });
    });

    it("should handle missing optional fields in configuration", async () => {
      const minimalConfig: AIPhoneServiceConfiguration = {
        generalPrompt: "Minimal prompt",
      };

      await provider.setupConfiguration(minimalConfig);

      expect(mockService.setupAIConfiguration).toHaveBeenCalledWith({
        calApiKey: undefined,
        timeZone: undefined,
        eventTypeId: undefined,
        generalPrompt: "Minimal prompt",
        beginMessage: undefined,
        generalTools: undefined,
      });
    });
  });

  describe("deleteConfiguration", () => {
    beforeEach(() => {
      mockService.deleteAIConfiguration = vi.fn().mockResolvedValue({
        success: true,
        errors: [],
        deleted: { llm: true, agent: true },
      });
    });

    it("should delete AI configuration and return result", async () => {
      const config: AIPhoneServiceDeletion = {
        modelId: "test-llm-id",
        agentId: "test-agent-id",
      };

      const result = await provider.deleteConfiguration(config);

      expect(mockService.deleteAIConfiguration).toHaveBeenCalledWith({
        llmId: "test-llm-id",
        agentId: "test-agent-id",
      });

      expect(result).toEqual({
        success: true,
        errors: [],
        deleted: { model: true, agent: true },
      });
    });

    it("should handle partial deletion results", async () => {
      mockService.deleteAIConfiguration = vi.fn().mockResolvedValue({
        success: false,
        errors: ["Failed to delete LLM"],
        deleted: { llm: false, agent: true },
      });

      const config: AIPhoneServiceDeletion = {
        modelId: "test-llm-id",
        agentId: "test-agent-id",
      };

      const result = await provider.deleteConfiguration(config);

      expect(result).toEqual({
        success: false,
        errors: ["Failed to delete LLM"],
        deleted: { model: false, agent: true },
      });
    });
  });

  describe("updateModelConfiguration", () => {
    let updateLLMConfigurationMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      updateLLMConfigurationMock = vi.fn().mockResolvedValue({ llm_id: "test-llm-id" });

      mockService = createMockRetellAIService({
        updateLLMConfiguration: updateLLMConfigurationMock,
      });

      provider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should update model configuration", async () => {
      const modelId = "test-llm-id";
      const updateData: AIPhoneServiceUpdateModelParams = {
        general_prompt: "Updated prompt",
        begin_message: "Updated begin message",
      };

      const result = await provider.updateModelConfiguration(modelId, updateData);

      expect(updateLLMConfigurationMock).toHaveBeenCalledWith(modelId, updateData);
      expect(result).toEqual({ llm_id: "test-llm-id" });
    });
  });

  describe("getModelDetails", () => {
    let getLLMDetailsMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      getLLMDetailsMock = vi.fn().mockResolvedValue({ llm_id: "test-llm-id", general_prompt: "Test prompt" });

      mockService = createMockRetellAIService({
        getLLMDetails: getLLMDetailsMock,
      });

      provider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should get model details", async () => {
      const modelId = "test-llm-id";

      const result = await provider.getModelDetails(modelId);

      expect(getLLMDetailsMock).toHaveBeenCalledWith(modelId);
      expect(result).toEqual({ llm_id: "test-llm-id", general_prompt: "Test prompt" });
    });
  });

  describe("getAgent", () => {
    let getAgentMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      getAgentMock = vi.fn().mockResolvedValue({ agent_id: "test-agent-id", agent_name: "Test Agent" });

      mockService = createMockRetellAIService({
        getAgent: getAgentMock,
      });

      provider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should get agent details", async () => {
      const agentId = "test-agent-id";

      const result = await provider.getAgent(agentId);

      expect(getAgentMock).toHaveBeenCalledWith(agentId);
      expect(result).toEqual({ agent_id: "test-agent-id", agent_name: "Test Agent" });
    });
  });

  describe("updateAgent", () => {
    let updateAgentMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      updateAgentMock = vi.fn().mockResolvedValue({ agent_id: "test-agent-id" });

      mockService = createMockRetellAIService({
        updateAgent: updateAgentMock,
      });

      provider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should update agent", async () => {
      const agentId = "test-agent-id";
      const updateData: AIPhoneServiceUpdateAgentParams = {
        agent_name: "Updated Agent Name",
      };

      const result = await provider.updateAgent(agentId, updateData);

      expect(updateAgentMock).toHaveBeenCalledWith(agentId, updateData);
      expect(result).toEqual({ agent_id: "test-agent-id" });
    });
  });

  describe("createPhoneCall", () => {
    let mockService: RetellAIService;
    let testProvider: RetellAIPhoneServiceProvider;
    let createPhoneCallMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      createPhoneCallMock = vi.fn().mockResolvedValue({ call_id: "test-call-id" });

      mockService = createMockRetellAIService({
        createPhoneCall: createPhoneCallMock,
      });

      testProvider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should create phone call", async () => {
      const callData: AIPhoneServiceCallData = {
        fromNumber: "+1234567890",
        toNumber: "+0987654321",
        dynamicVariables: {
          name: "John Doe",
          email: "john@example.com",
        },
      };

      const result = await testProvider.createPhoneCall(callData);

      expect(createPhoneCallMock).toHaveBeenCalledWith(callData);
      expect(result).toEqual({ call_id: "test-call-id" });
    });

    it("should handle call data without dynamic variables", async () => {
      const callData: AIPhoneServiceCallData = {
        fromNumber: "+1234567890",
        toNumber: "+0987654321",
      };

      await testProvider.createPhoneCall(callData);

      expect(createPhoneCallMock).toHaveBeenCalledWith(callData);
    });
  });

  describe("createPhoneNumber", () => {
    let mockService: RetellAIService;
    let testProvider: RetellAIPhoneServiceProvider;
    let createPhoneNumberMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      createPhoneNumberMock = vi
        .fn()
        .mockResolvedValue({ phone_number: "+1234567890", provider: "retellAI" });

      mockService = createMockRetellAIService({
        createPhoneNumber: createPhoneNumberMock,
      });

      testProvider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should create phone number with proper parameter mapping", async () => {
      const phoneNumberData: AIPhoneServiceCreatePhoneNumberParams = {
        area_code: 415,
        nickname: "Test Phone",
        inbound_agent_id: "inbound-agent-id",
        outbound_agent_id: "outbound-agent-id",
      };

      const result = await testProvider.createPhoneNumber(phoneNumberData);

      expect(createPhoneNumberMock).toHaveBeenCalledWith({
        area_code: 415,
        nickname: "Test Phone",
        inbound_agent_id: "inbound-agent-id",
        outbound_agent_id: "outbound-agent-id",
      });
      expect(result).toEqual({ phone_number: "+1234567890", provider: "retellAI" });
    });

    it("should handle optional parameters in phone number creation", async () => {
      const minimalData: AIPhoneServiceCreatePhoneNumberParams = {
        area_code: 415,
      };

      await testProvider.createPhoneNumber(minimalData);

      expect(createPhoneNumberMock).toHaveBeenCalledWith({
        area_code: 415,
        nickname: undefined,
        inbound_agent_id: undefined,
        outbound_agent_id: undefined,
      });
    });
  });

  describe("importPhoneNumber", () => {
    let mockService: RetellAIService;
    let testProvider: RetellAIPhoneServiceProvider;
    let importPhoneNumberMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      importPhoneNumberMock = vi.fn().mockResolvedValue({ phone_number: "+1234567890" });

      mockService = createMockRetellAIService({
        importPhoneNumber: importPhoneNumberMock,
      });

      testProvider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should import phone number", async () => {
      const importData: AIPhoneServiceImportPhoneNumberParams = {
        phone_number: "+1234567890",
        termination_uri: "https://example.com/webhook",
        sip_trunk_auth_username: "username",
        sip_trunk_auth_password: "password",
        nickname: "Imported Phone",
        userId: 123,
      };

      const result = await testProvider.importPhoneNumber(importData);

      expect(importPhoneNumberMock).toHaveBeenCalledWith(importData);
      expect(result).toEqual({ phone_number: "+1234567890" });
    });
  });

  describe("deletePhoneNumber", () => {
    let mockService: RetellAIService;
    let testProvider: RetellAIPhoneServiceProvider;
    let deletePhoneNumberMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      deletePhoneNumberMock = vi.fn().mockResolvedValue(undefined);

      mockService = createMockRetellAIService({
        deletePhoneNumber: deletePhoneNumberMock,
      });

      testProvider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should delete phone number", async () => {
      const deleteParams = {
        phoneNumber: "+1234567890",
        userId: 123,
        deleteFromDB: true,
      };

      await testProvider.deletePhoneNumber(deleteParams);

      expect(deletePhoneNumberMock).toHaveBeenCalledWith(deleteParams);
    });

    it("should handle deletion without database cleanup", async () => {
      const deleteParams = {
        phoneNumber: "+1234567890",
        userId: 123,
        deleteFromDB: false,
      };

      await testProvider.deletePhoneNumber(deleteParams);

      expect(deletePhoneNumberMock).toHaveBeenCalledWith(deleteParams);
    });
  });

  describe("getPhoneNumber", () => {
    let mockService: RetellAIService;
    let testProvider: RetellAIPhoneServiceProvider;
    let getPhoneNumberMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      getPhoneNumberMock = vi.fn().mockResolvedValue({ phone_number: "+1234567890" });

      mockService = createMockRetellAIService({
        getPhoneNumber: getPhoneNumberMock,
      });

      testProvider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should get phone number details", async () => {
      const phoneNumber = "+1234567890";

      const result = await testProvider.getPhoneNumber(phoneNumber);

      expect(getPhoneNumberMock).toHaveBeenCalledWith(phoneNumber);
      expect(result).toEqual({ phone_number: "+1234567890" });
    });
  });

  describe("updatePhoneNumber", () => {
    let mockService: RetellAIService;
    let testProvider: RetellAIPhoneServiceProvider;
    let updatePhoneNumberMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      updatePhoneNumberMock = vi.fn().mockResolvedValue({ phone_number: "+1234567890" });

      mockService = createMockRetellAIService({
        updatePhoneNumber: updatePhoneNumberMock,
      });

      testProvider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );
    });

    it("should update phone number with proper parameter mapping", async () => {
      const phoneNumber = "+1234567890";
      const updateData: AIPhoneServiceUpdatePhoneNumberParams = {
        inbound_agent_id: "new-inbound-agent",
        outbound_agent_id: "new-outbound-agent",
      };

      const result = await testProvider.updatePhoneNumber(phoneNumber, updateData);

      expect(updatePhoneNumberMock).toHaveBeenCalledWith(phoneNumber, {
        inbound_agent_id: "new-inbound-agent",
        outbound_agent_id: "new-outbound-agent",
      });
      expect(result).toEqual({ phone_number: "+1234567890" });
    });

    it("should handle partial updates", async () => {
      const phoneNumber = "+1234567890";
      const updateData: AIPhoneServiceUpdatePhoneNumberParams = {
        inbound_agent_id: "new-inbound-agent",
      };

      await testProvider.updatePhoneNumber(phoneNumber, updateData);

      expect(updatePhoneNumberMock).toHaveBeenCalledWith(phoneNumber, {
        inbound_agent_id: "new-inbound-agent",
        outbound_agent_id: undefined,
      });
    });

    it("should handle null values in update data", async () => {
      const phoneNumber = "+1234567890";
      const updateData: AIPhoneServiceUpdatePhoneNumberParams = {
        inbound_agent_id: null,
        outbound_agent_id: "new-outbound-agent",
      };

      await testProvider.updatePhoneNumber(phoneNumber, updateData);

      expect(updatePhoneNumberMock).toHaveBeenCalledWith(phoneNumber, {
        inbound_agent_id: null,
        outbound_agent_id: "new-outbound-agent",
      });
    });
  });

  describe("error handling", () => {
    it("should propagate errors from service layer", async () => {
      const setupAIConfigurationMock = vi.fn().mockRejectedValue(new Error("Service error"));

      const mockService = createMockRetellAIService({
        setupAIConfiguration: setupAIConfigurationMock,
      });

      const testProvider = new RetellAIPhoneServiceProvider(
        mockRepository,
        mockAgentRepository,
        mockPhoneNumberRepository,
        mockTransactionManager,
        mockService
      );

      const config: AIPhoneServiceConfiguration = {
        generalPrompt: "Test prompt",
      };

      await expect(testProvider.setupConfiguration(config)).rejects.toThrow("Service error");
    });
  });
});
