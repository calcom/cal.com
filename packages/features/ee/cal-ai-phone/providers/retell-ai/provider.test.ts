import { describe, it, expect, beforeEach, vi } from "vitest";

import type {
  AIPhoneServiceConfiguration,
  AIPhoneServiceDeletion,
  AIPhoneServiceCallData,
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParams,
  AIPhoneServiceUpdatePhoneNumberParams,
  AIPhoneServiceUpdateAgentParams,
  updateLLMConfigurationParams,
} from "../../interfaces/ai-phone-service.interface";
import { RetellAIProvider } from "./provider";
import type { RetellAIRepository } from "./types";

describe("RetellAIProvider", () => {
  let mockRepository: RetellAIRepository;
  let provider: RetellAIProvider;

  beforeEach(() => {
    mockRepository = {
      createLLM: vi.fn().mockResolvedValue({ llm_id: "test-llm-id" }),
      getLLM: vi.fn().mockResolvedValue({ llm_id: "test-llm-id", general_prompt: "test prompt" }),
      updateLLM: vi.fn().mockResolvedValue({ llm_id: "test-llm-id" }),
      deleteLLM: vi.fn().mockResolvedValue(undefined),

      // Agent operations
      createAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id" }),
      getAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id", agent_name: "Test Agent" }),
      updateAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id" }),
      deleteAgent: vi.fn().mockResolvedValue(undefined),

      // Phone number operations
      createPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      importPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      deletePhoneNumber: vi.fn().mockResolvedValue(undefined),
      getPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      updatePhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),

      // Call operations
      createPhoneCall: vi.fn().mockResolvedValue({ call_id: "test-call-id" }),
    };

    provider = new RetellAIProvider(mockRepository);
  });

  describe("setupConfiguration", () => {
    const mockService = {
      setupAIConfiguration: vi.fn().mockResolvedValue({
        llmId: "test-llm-id",
        agentId: "test-agent-id",
      }),
    };

    beforeEach(() => {
      // Mock the service property
      (provider as any).service = mockService;
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
        llmId: "test-llm-id",
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
    const mockService = {
      deleteAIConfiguration: vi.fn().mockResolvedValue({
        success: true,
        errors: [],
        deleted: { llm: true, agent: true },
      }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should delete AI configuration and return result", async () => {
      const config: AIPhoneServiceDeletion = {
        llmId: "test-llm-id",
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
        deleted: { llm: true, agent: true },
      });
    });

    it("should handle partial deletion results", async () => {
      mockService.deleteAIConfiguration.mockResolvedValue({
        success: false,
        errors: ["Failed to delete LLM"],
        deleted: { llm: false, agent: true },
      });

      const config: AIPhoneServiceDeletion = {
        llmId: "test-llm-id",
        agentId: "test-agent-id",
      };

      const result = await provider.deleteConfiguration(config);

      expect(result).toEqual({
        success: false,
        errors: ["Failed to delete LLM"],
        deleted: { llm: false, agent: true },
      });
    });
  });

  describe("updateLLMConfiguration", () => {
    const mockService = {
      updateLLMConfiguration: vi.fn().mockResolvedValue({ llm_id: "test-llm-id" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should update LLM configuration", async () => {
      const llmId = "test-llm-id";
      const updateData: updateLLMConfigurationParams = {
        general_prompt: "Updated prompt",
        begin_message: "Updated begin message",
      };

      const result = await provider.updateLLMConfiguration(llmId, updateData);

      expect(mockService.updateLLMConfiguration).toHaveBeenCalledWith(llmId, updateData);
      expect(result).toEqual({ llm_id: "test-llm-id" });
    });
  });

  describe("getLLMDetails", () => {
    const mockService = {
      getLLMDetails: vi.fn().mockResolvedValue({ llm_id: "test-llm-id", general_prompt: "Test prompt" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should get LLM details", async () => {
      const llmId = "test-llm-id";

      const result = await provider.getLLMDetails(llmId);

      expect(mockService.getLLMDetails).toHaveBeenCalledWith(llmId);
      expect(result).toEqual({ llm_id: "test-llm-id", general_prompt: "Test prompt" });
    });
  });

  describe("getAgent", () => {
    const mockService = {
      getAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id", agent_name: "Test Agent" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should get agent details", async () => {
      const agentId = "test-agent-id";

      const result = await provider.getAgent(agentId);

      expect(mockService.getAgent).toHaveBeenCalledWith(agentId);
      expect(result).toEqual({ agent_id: "test-agent-id", agent_name: "Test Agent" });
    });
  });

  describe("updateAgent", () => {
    const mockService = {
      updateAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent-id" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should update agent", async () => {
      const agentId = "test-agent-id";
      const updateData: AIPhoneServiceUpdateAgentParams = {
        agent_name: "Updated Agent Name",
      };

      const result = await provider.updateAgent(agentId, updateData);

      expect(mockService.updateAgent).toHaveBeenCalledWith(agentId, updateData);
      expect(result).toEqual({ agent_id: "test-agent-id" });
    });
  });

  describe("createPhoneCall", () => {
    const mockService = {
      createPhoneCall: vi.fn().mockResolvedValue({ call_id: "test-call-id" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should create phone call", async () => {
      const callData: AIPhoneServiceCallData = {
        from_number: "+1234567890",
        to_number: "+0987654321",
        retell_llm_dynamic_variables: {
          name: "John Doe",
          email: "john@example.com",
        },
      };

      const result = await provider.createPhoneCall(callData);

      expect(mockService.createPhoneCall).toHaveBeenCalledWith(callData);
      expect(result).toEqual({ call_id: "test-call-id" });
    });

    it("should handle call data without dynamic variables", async () => {
      const callData: AIPhoneServiceCallData = {
        from_number: "+1234567890",
        to_number: "+0987654321",
      };

      await provider.createPhoneCall(callData);

      expect(mockService.createPhoneCall).toHaveBeenCalledWith(callData);
    });
  });

  describe("createPhoneNumber", () => {
    const mockService = {
      createPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should create phone number with proper parameter mapping", async () => {
      const phoneNumberData: AIPhoneServiceCreatePhoneNumberParams = {
        area_code: 415,
        nickname: "Test Phone",
        inbound_agent_id: "inbound-agent-id",
        outbound_agent_id: "outbound-agent-id",
      };

      const result = await provider.createPhoneNumber(phoneNumberData);

      expect(mockService.createPhoneNumber).toHaveBeenCalledWith({
        area_code: 415,
        nickname: "Test Phone",
        inbound_agent_id: "inbound-agent-id",
        outbound_agent_id: "outbound-agent-id",
      });
      expect(result).toEqual({ phone_number: "+1234567890" });
    });

    it("should handle optional parameters in phone number creation", async () => {
      const minimalData: AIPhoneServiceCreatePhoneNumberParams = {
        area_code: 415,
      };

      await provider.createPhoneNumber(minimalData);

      expect(mockService.createPhoneNumber).toHaveBeenCalledWith({
        area_code: 415,
        nickname: undefined,
        inbound_agent_id: undefined,
        outbound_agent_id: undefined,
      });
    });
  });

  describe("importPhoneNumber", () => {
    const mockService = {
      importPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should import phone number", async () => {
      const importData: AIPhoneServiceImportPhoneNumberParams = {
        phone_number: "+1234567890",
        termination_uri: "https://example.com/webhook",
        sip_trunk_auth_username: "username",
        sip_trunk_auth_password: "password",
        nickname: "Imported Phone",
      };

      const result = await provider.importPhoneNumber(importData);

      expect(mockService.importPhoneNumber).toHaveBeenCalledWith(importData);
      expect(result).toEqual({ phone_number: "+1234567890" });
    });
  });

  describe("deletePhoneNumber", () => {
    const mockService = {
      deletePhoneNumber: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should delete phone number", async () => {
      const deleteParams = {
        phoneNumber: "+1234567890",
        userId: 123,
        deleteFromDB: true,
      };

      await provider.deletePhoneNumber(deleteParams);

      expect(mockService.deletePhoneNumber).toHaveBeenCalledWith(deleteParams);
    });

    it("should handle deletion without database cleanup", async () => {
      const deleteParams = {
        phoneNumber: "+1234567890",
        userId: 123,
        deleteFromDB: false,
      };

      await provider.deletePhoneNumber(deleteParams);

      expect(mockService.deletePhoneNumber).toHaveBeenCalledWith(deleteParams);
    });
  });

  describe("getPhoneNumber", () => {
    const mockService = {
      getPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should get phone number details", async () => {
      const phoneNumber = "+1234567890";

      const result = await provider.getPhoneNumber(phoneNumber);

      expect(mockService.getPhoneNumber).toHaveBeenCalledWith(phoneNumber);
      expect(result).toEqual({ phone_number: "+1234567890" });
    });
  });

  describe("updatePhoneNumber", () => {
    const mockService = {
      updatePhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
    };

    beforeEach(() => {
      (provider as any).service = mockService;
    });

    it("should update phone number with proper parameter mapping", async () => {
      const phoneNumber = "+1234567890";
      const updateData: AIPhoneServiceUpdatePhoneNumberParams = {
        inbound_agent_id: "new-inbound-agent",
        outbound_agent_id: "new-outbound-agent",
      };

      const result = await provider.updatePhoneNumber(phoneNumber, updateData);

      expect(mockService.updatePhoneNumber).toHaveBeenCalledWith(phoneNumber, {
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

      await provider.updatePhoneNumber(phoneNumber, updateData);

      expect(mockService.updatePhoneNumber).toHaveBeenCalledWith(phoneNumber, {
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

      await provider.updatePhoneNumber(phoneNumber, updateData);

      expect(mockService.updatePhoneNumber).toHaveBeenCalledWith(phoneNumber, {
        inbound_agent_id: null,
        outbound_agent_id: "new-outbound-agent",
      });
    });
  });

  describe("error handling", () => {
    it("should propagate errors from service layer", async () => {
      const mockService = {
        setupAIConfiguration: vi.fn().mockRejectedValue(new Error("Service error")),
      };
      (provider as any).service = mockService;

      const config: AIPhoneServiceConfiguration = {
        generalPrompt: "Test prompt",
      };

      await expect(provider.setupConfiguration(config)).rejects.toThrow("Service error");
    });
  });
});
