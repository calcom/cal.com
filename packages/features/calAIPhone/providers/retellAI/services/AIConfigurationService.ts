import type { AIPhoneServiceUpdateModelParams } from "../../../interfaces/ai-phone-service.interface";
import { DEFAULT_BEGIN_MESSAGE, DEFAULT_PROMPT_VALUE } from "../../../promptTemplates";
import { RetellAIServiceMapper } from "../RetellAIServiceMapper";
import type { 
  RetellAIRepository, 
  RetellLLM,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult 
} from "../types";

export class AIConfigurationService {
  constructor(private retellRepository: RetellAIRepository) {}

  async setupAIConfiguration(config: AIConfigurationSetup): Promise<{ llmId: string; agentId: string }> {
    const generalTools = RetellAIServiceMapper.buildGeneralTools(config);

    const llmRequest = RetellAIServiceMapper.mapToCreateLLMRequest(
      {
        ...config,
        generalPrompt: config.generalPrompt || DEFAULT_PROMPT_VALUE,
        beginMessage: config.beginMessage || DEFAULT_BEGIN_MESSAGE,
      },
      generalTools
    );
    const llm = await this.retellRepository.createLLM(llmRequest);

    const agentRequest = RetellAIServiceMapper.mapToCreateAgentRequest(llm.llm_id, config.eventTypeId);
    const agent = await this.retellRepository.createAgent(agentRequest);

    return { llmId: llm.llm_id, agentId: agent.agent_id };
  }

  async deleteAIConfiguration(config: AIConfigurationDeletion): Promise<DeletionResult> {
    const result: DeletionResult = {
      success: true,
      errors: [],
      deleted: {
        llm: false,
        agent: false,
      },
    };

    if (config.agentId) {
      try {
        await this.retellRepository.deleteAgent(config.agentId);
        result.deleted.agent = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to delete agent: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;
      }
    } else {
      result.deleted.agent = true;
    }

    // Delete LLM
    if (config.llmId) {
      try {
        await this.retellRepository.deleteLLM(config.llmId);
        result.deleted.llm = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to delete LLM: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;
      }
    } else {
      result.deleted.llm = true; // No LLM to delete
    }

    return result;
  }

  async updateLLMConfiguration(llmId: string, data: AIPhoneServiceUpdateModelParams): Promise<RetellLLM> {
    const updateRequest = RetellAIServiceMapper.mapToUpdateLLMRequest(data);
    return this.retellRepository.updateLLM(llmId, updateRequest);
  }

  async getLLMDetails(llmId: string): Promise<RetellLLM> {
    return this.retellRepository.getLLM(llmId);
  }
}