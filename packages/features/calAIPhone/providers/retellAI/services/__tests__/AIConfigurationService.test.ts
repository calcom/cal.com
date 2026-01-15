import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AIConfigurationService } from "../AIConfigurationService";
import { setupBasicMocks, createMockLLM, createMockAgent, TestError } from "./test-utils";

describe("AIConfigurationService", () => {
  let service: AIConfigurationService;
  let mocks: ReturnType<typeof setupBasicMocks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupBasicMocks();

    service = new AIConfigurationService({
      retellRepository: mocks.mockRetellRepository,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("setupAIConfiguration", () => {
    const validConfig = {
      calApiKey: "cal_live_123",
      timeZone: "America/New_York",
      eventTypeId: 12345,
    };

    it("should successfully setup AI configuration", async () => {
      const mockLLM = createMockLLM();
      const mockAgent = createMockAgent();

      mocks.mockRetellRepository.createLLM.mockResolvedValue(mockLLM);
      mocks.mockRetellRepository.createOutboundAgent.mockResolvedValue(mockAgent);

      const result = await service.setupAIConfiguration(validConfig);

      expect(result).toEqual({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      expect(mocks.mockRetellRepository.createLLM).toHaveBeenCalled();
      expect(mocks.mockRetellRepository.createOutboundAgent).toHaveBeenCalled();
    });

    it("should handle LLM creation failure", async () => {
      mocks.mockRetellRepository.createLLM.mockRejectedValue(new TestError("LLM creation failed"));

      await expect(service.setupAIConfiguration(validConfig)).rejects.toThrow("LLM creation failed");
    });
  });

  describe("deleteAIConfiguration", () => {
    it("should successfully delete both agent and LLM", async () => {
      const result = await service.deleteAIConfiguration({
        agentId: "agent-123",
        llmId: "llm-123",
      });

      expect(result).toEqual({
        success: true,
        errors: [],
        deleted: {
          agent: true,
          llm: true,
        },
      });

      expect(mocks.mockRetellRepository.deleteAgent).toHaveBeenCalledWith("agent-123");
      expect(mocks.mockRetellRepository.deleteLLM).toHaveBeenCalledWith("llm-123");
    });

    it("should handle partial failures gracefully", async () => {
      mocks.mockRetellRepository.deleteAgent.mockRejectedValue(new TestError("Agent delete failed"));

      const result = await service.deleteAIConfiguration({
        agentId: "agent-123",
        llmId: "llm-123",
      });

      expect(result).toEqual({
        success: false,
        errors: ["Agent delete failed"],
        deleted: {
          agent: false,
          llm: true,
        },
      });
    });
  });

  describe("getLLMDetails", () => {
    it("should return LLM details", async () => {
      const mockLLM = createMockLLM();
      mocks.mockRetellRepository.getLLM.mockResolvedValue(mockLLM);

      const result = await service.getLLMDetails("llm-123");

      expect(result).toEqual(mockLLM);
      expect(mocks.mockRetellRepository.getLLM).toHaveBeenCalledWith("llm-123");
    });
  });
});
