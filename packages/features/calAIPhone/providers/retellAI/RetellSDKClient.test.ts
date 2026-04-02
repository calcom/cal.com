import process from "node:process";
import logger from "@calcom/lib/logger";
import { Retell } from "retell-sdk";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateAgentRequest,
  CreateLLMRequest,
  CreatePhoneNumberParams,
  ImportPhoneNumberParams,
  RetellDynamicVariables,
  UpdateAgentRequest,
  UpdateLLMRequest,
} from "./types";

let RetellSDKClient: typeof import("./RetellSDKClient").RetellSDKClient;

vi.mock("retell-sdk", () => ({
  Retell: vi.fn().mockImplementation(function () {
    return {
      llm: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      agent: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      phoneNumber: {
        create: vi.fn(),
        import: vi.fn(),
        delete: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
      },
      call: {
        createPhoneCall: vi.fn(),
      },
    };
  }),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

const TEST_API_KEY = "test-retell-api-key";

describe("RetellSDKClient", () => {
  beforeAll(() => {
    const originalEnv = process.env.RETELL_AI_KEY;
    vi.stubEnv("RETELL_AI_KEY", TEST_API_KEY);

    return () => {
      if (originalEnv !== undefined) {
        vi.stubEnv("RETELL_AI_KEY", originalEnv);
      } else {
        vi.unstubAllEnvs();
      }
    };
  });
  let client: RetellSDKClient;
  let mockRetellInstance: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    mockRetellInstance = {
      llm: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      agent: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      phoneNumber: {
        create: vi.fn(),
        import: vi.fn(),
        delete: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
      },
      call: {
        createPhoneCall: vi.fn(),
      },
    };

    (Retell as any).mockImplementation(function () {
      return mockRetellInstance;
    });
  });

  describe("constructor", () => {
    beforeAll(async () => {
      // Reset modules and reimport with mocked env var
      vi.resetModules();
      const moduleImport = await import("./RetellSDKClient");
      RetellSDKClient = moduleImport.RetellSDKClient;
    });

    it("should create client with default logger when no custom logger provided", () => {
      client = new RetellSDKClient();

      expect(logger.getSubLogger).toHaveBeenCalledWith({ prefix: ["retellSDKClient:"] });
      expect(Retell).toHaveBeenCalledWith({ apiKey: TEST_API_KEY });
    });

    it("should create client with custom logger", () => {
      client = new RetellSDKClient(mockLogger);

      expect(logger.getSubLogger).not.toHaveBeenCalled();
      expect(Retell).toHaveBeenCalledWith({ apiKey: TEST_API_KEY });
    });

    it("should throw error when RETELL_AI_KEY is not configured", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("RETELL_AI_KEY", "");

      vi.resetModules();
      const { RetellSDKClient: TestRetellSDKClient } = await import("./RetellSDKClient");

      expect(() => {
        new TestRetellSDKClient();
      }).toThrow("RETELL_API_KEY is not configured");

      // Restore the env var
      vi.stubEnv("RETELL_AI_KEY", TEST_API_KEY);
    });
  });

  describe("LLM operations", () => {
    beforeEach(() => {
      client = new RetellSDKClient(mockLogger);
    });

    describe("createLLM", () => {
      it("should create and return LLM", async () => {
        const mockRequest: CreateLLMRequest = {
          general_prompt: "Test prompt",
        };
        const mockResponse = { llm_id: "test-llm-id" };

        mockRetellInstance.llm.create.mockResolvedValue(mockResponse);

        const result = await client.createLLM(mockRequest);

        expect(mockRetellInstance.llm.create).toHaveBeenCalledWith(mockRequest);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("getLLM", () => {
      it("should get LLM", async () => {
        const llmId = "test-llm-id";
        const mockResponse = { llm_id: llmId, general_prompt: "Test prompt" };

        mockRetellInstance.llm.retrieve.mockResolvedValue(mockResponse);

        const result = await client.getLLM(llmId);

        expect(mockRetellInstance.llm.retrieve).toHaveBeenCalledWith(llmId);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("updateLLM", () => {
      it("should update LLM", async () => {
        const llmId = "test-llm-id";
        const updateData: UpdateLLMRequest = {
          general_prompt: "Updated prompt",
        };
        const mockResponse = { llm_id: llmId };

        mockRetellInstance.llm.update.mockResolvedValue(mockResponse);

        const result = await client.updateLLM(llmId, updateData);

        expect(mockRetellInstance.llm.update).toHaveBeenCalledWith(llmId, updateData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("deleteLLM", () => {
      it("should delete LLM", async () => {
        const llmId = "test-llm-id";

        mockRetellInstance.llm.delete.mockResolvedValue(undefined);

        await client.deleteLLM(llmId);

        expect(mockRetellInstance.llm.delete).toHaveBeenCalledWith(llmId);
      });
    });
  });

  describe("Agent operations", () => {
    beforeEach(() => {
      client = new RetellSDKClient(mockLogger);
    });

    describe("createOutboundAgent", () => {
      it("should create agent", async () => {
        const mockRequest: CreateAgentRequest = {
          agent_name: "Test Agent",
          response_engine: { type: "retell-llm", llm_id: "test-llm-id" },
          voice_id: "test-voice-id",
        };
        const mockResponse = { agent_id: "test-agent-id", agent_name: "Test Agent" };

        mockRetellInstance.agent.create.mockResolvedValue(mockResponse);

        const result = await client.createOutboundAgent(mockRequest);

        expect(mockRetellInstance.agent.create).toHaveBeenCalledWith(mockRequest);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("getAgent", () => {
      it("should get agent", async () => {
        const agentId = "test-agent-id";
        const mockResponse = { agent_id: agentId, agent_name: "Test Agent" };

        mockRetellInstance.agent.retrieve.mockResolvedValue(mockResponse);

        const result = await client.getAgent(agentId);

        expect(mockRetellInstance.agent.retrieve).toHaveBeenCalledWith(agentId);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("updateAgent", () => {
      it("should update agent", async () => {
        const agentId = "test-agent-id";
        const updateData: UpdateAgentRequest = {
          agent_name: "Updated Agent",
        };
        const mockResponse = { agent_id: agentId, agent_name: "Updated Agent" };

        mockRetellInstance.agent.update.mockResolvedValue(mockResponse);

        const result = await client.updateAgent(agentId, updateData);

        expect(mockRetellInstance.agent.update).toHaveBeenCalledWith(agentId, updateData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("deleteAgent", () => {
      it("should delete agent", async () => {
        const agentId = "test-agent-id";

        mockRetellInstance.agent.delete.mockResolvedValue(undefined);

        await client.deleteAgent(agentId);

        expect(mockRetellInstance.agent.delete).toHaveBeenCalledWith(agentId);
      });
    });
  });

  describe("Phone number operations", () => {
    beforeEach(() => {
      client = new RetellSDKClient(mockLogger);
    });

    describe("createPhoneNumber", () => {
      it("should create phone number", async () => {
        const phoneData: CreatePhoneNumberParams = {
          area_code: 415,
          nickname: "Test Phone",
        };
        const mockResponse = { phone_number: "+14155551234" };

        mockRetellInstance.phoneNumber.create.mockResolvedValue(mockResponse);

        const result = await client.createPhoneNumber(phoneData);

        expect(mockRetellInstance.phoneNumber.create).toHaveBeenCalledWith(phoneData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("importPhoneNumber", () => {
      it("should import phone number", async () => {
        const importData: ImportPhoneNumberParams = {
          phone_number: "+14155551234",
          termination_uri: "https://example.com/webhook",
          sip_trunk_auth_username: "username",
          sip_trunk_auth_password: "password",
        };
        const mockResponse = { phone_number: "+14155551234" };

        mockRetellInstance.phoneNumber.import.mockResolvedValue(mockResponse);

        const result = await client.importPhoneNumber(importData);

        expect(mockRetellInstance.phoneNumber.import).toHaveBeenCalledWith(importData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("deletePhoneNumber", () => {
      it("should delete phone number", async () => {
        const phoneNumber = "+14155551234";

        mockRetellInstance.phoneNumber.delete.mockResolvedValue(undefined);

        await client.deletePhoneNumber(phoneNumber);

        expect(mockRetellInstance.phoneNumber.delete).toHaveBeenCalledWith(phoneNumber);
      });
    });

    describe("getPhoneNumber", () => {
      it("should get phone number", async () => {
        const phoneNumber = "+14155551234";
        const mockResponse = { phone_number: phoneNumber };

        mockRetellInstance.phoneNumber.retrieve.mockResolvedValue(mockResponse);

        const result = await client.getPhoneNumber(phoneNumber);

        expect(mockRetellInstance.phoneNumber.retrieve).toHaveBeenCalledWith(phoneNumber);
        expect(result).toEqual(mockResponse);
      });
    });

    describe("updatePhoneNumber", () => {
      it("should update phone number", async () => {
        const phoneNumber = "+14155551234";
        const updateData = {
          inbound_agent_id: "new-inbound",
        };
        const mockResponse = { phone_number: phoneNumber };

        mockRetellInstance.phoneNumber.update.mockResolvedValue(mockResponse);

        const result = await client.updatePhoneNumber(phoneNumber, updateData);

        expect(mockRetellInstance.phoneNumber.update).toHaveBeenCalledWith(phoneNumber, updateData);
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe("Call operations", () => {
    beforeEach(() => {
      client = new RetellSDKClient(mockLogger);
    });

    describe("createPhoneCall", () => {
      it("should create phone call", async () => {
        const callData = {
          fromNumber: "+14155551234",
          toNumber: "+14155555678",
          dynamicVariables: {
            name: "John Doe",
            email: "john@example.com",
          } as RetellDynamicVariables,
        };
        const mockResponse = { call_id: "test-call-id" };

        mockRetellInstance.call.createPhoneCall.mockResolvedValue(mockResponse);

        const result = await client.createPhoneCall(callData);

        expect(mockRetellInstance.call.createPhoneCall).toHaveBeenCalledWith({
          from_number: "+14155551234",
          to_number: "+14155555678",
          retell_llm_dynamic_variables: {
            name: "John Doe",
            email: "john@example.com",
          },
        });
        expect(result).toEqual(mockResponse);
      });

      it("should handle undefined dynamic variables", async () => {
        const callData = {
          fromNumber: "+14155551234",
          toNumber: "+14155555678",
          dynamicVariables: undefined,
        };
        const mockResponse = { call_id: "test-call-id" };

        mockRetellInstance.call.createPhoneCall.mockResolvedValue(mockResponse);

        const result = await client.createPhoneCall(callData);

        expect(mockRetellInstance.call.createPhoneCall).toHaveBeenCalledWith({
          from_number: "+14155551234",
          to_number: "+14155555678",
          retell_llm_dynamic_variables: undefined,
        });
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe("Edge cases", () => {
    beforeEach(() => {
      client = new RetellSDKClient(mockLogger);
    });

    it("should handle special characters in phone numbers", async () => {
      const phoneNumber = "+1 (415) 555-1234";
      const mockResponse = { phone_number: phoneNumber };

      mockRetellInstance.phoneNumber.retrieve.mockResolvedValue(mockResponse);

      const result = await client.getPhoneNumber(phoneNumber);

      expect(mockRetellInstance.phoneNumber.retrieve).toHaveBeenCalledWith(phoneNumber);
      expect(result).toEqual(mockResponse);
    });
  });
});
