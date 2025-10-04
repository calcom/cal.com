import logger from "@calcom/lib/logger";

import type {
  AIPhoneServiceUpdateModelParams,
  AIPhoneServiceProviderType,
  AIPhoneServiceModel,
} from "../../../interfaces/AIPhoneService.interface";
import { DEFAULT_BEGIN_MESSAGE, DEFAULT_PROMPT_VALUE } from "../../../promptTemplates";
import { RetellAIServiceMapper } from "../RetellAIServiceMapper";
import type {
  RetellAIRepository,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
} from "../types";

type Dependencies = {
  retellRepository: RetellAIRepository;
};

export class AIConfigurationService {
  private logger = logger.getSubLogger({ prefix: ["AIConfigurationService"] });
  constructor(private deps: Dependencies) {}

  async setupAIConfiguration(config: AIConfigurationSetup): Promise<{ llmId: string; agentId: string }> {
    let llmId: string | null = null;

    try {
      const generalTools = RetellAIServiceMapper.buildGeneralTools(config);

      const llmRequest = RetellAIServiceMapper.mapToCreateLLMRequest(
        {
          ...config,
          generalPrompt: config.generalPrompt || DEFAULT_PROMPT_VALUE,
          beginMessage: config.beginMessage || DEFAULT_BEGIN_MESSAGE,
        },
        generalTools
      );

      // Step 1: Create LLM
      const llm = await this.deps.retellRepository.createLLM(llmRequest);
      llmId = llm.llm_id;

      // Step 2: Create Agent
      const agentRequest = RetellAIServiceMapper.mapToCreateAgentRequest(llm.llm_id, config.eventTypeId);
      const agent = await this.deps.retellRepository.createOutboundAgent(agentRequest);

      return { llmId: llm.llm_id, agentId: agent.agent_id };
    } catch (error) {
      // Compensation: Clean up LLM if agent creation failed
      if (llmId) {
        try {
          await this.deps.retellRepository.deleteLLM(llmId);
          this.logger.info(`Successfully cleaned up orphaned LLM ${llmId} after setup failure`);
        } catch (cleanupError) {
          const errorMessage = `Failed to cleanup LLM ${llmId} after AI configuration setup failure. This will cause billing charges.`;
          this.logger.error(errorMessage, {
            llmId,
            originalError: error instanceof Error ? error.message : String(error),
            cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            timestamp: new Date().toISOString(),
            requiresManualCleanup: true,
          });
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to setup AI configuration: ${errorMessage}`);
    }
  }

  async deleteAIConfiguration(config: AIConfigurationDeletion): Promise<DeletionResult> {
    this.logger.info("Starting AI configuration deletion", {
      agentId: config.agentId,
      llmId: config.llmId,
      timestamp: new Date().toISOString(),
    });

    const result: DeletionResult = {
      success: true,
      errors: [],
      deleted: {
        llm: false,
        agent: false,
      },
    };

    // Delete Agent
    if (config.agentId) {
      try {
        this.logger.info(`Attempting to delete agent: ${config.agentId}`);
        await this.deps.retellRepository.deleteAgent(config.agentId);
        result.deleted.agent = true;
        this.logger.info(`Successfully deleted agent: ${config.agentId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to delete agent: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;
        this.logger.error("Failed to delete agent", {
          agentId: config.agentId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      result.deleted.agent = true;
      this.logger.info("No agent ID provided, skipping agent deletion");
    }

    // Delete LLM
    if (config.llmId) {
      try {
        this.logger.info(`Attempting to delete LLM: ${config.llmId}`);
        await this.deps.retellRepository.deleteLLM(config.llmId);
        result.deleted.llm = true;
        this.logger.info(`Successfully deleted LLM: ${config.llmId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to delete LLM: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;
        this.logger.error("Failed to delete LLM", {
          llmId: config.llmId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      result.deleted.llm = true;
      this.logger.info("No LLM ID provided, skipping LLM deletion");
    }

    this.logger.info("AI configuration deletion completed", {
      success: result.success,
      deletedAgent: result.deleted.agent,
      deletedLLM: result.deleted.llm,
      errorCount: result.errors.length,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async updateLLMConfiguration(
    llmId: string,
    data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<AIPhoneServiceModel<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!llmId?.trim()) {
      throw new Error("LLM ID is required and cannot be empty");
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error("Update data is required and cannot be empty");
    }

    try {
      const updateRequest = RetellAIServiceMapper.mapToUpdateLLMRequest(data);

      return await this.deps.retellRepository.updateLLM(llmId, updateRequest);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update LLM configuration for ${llmId}: ${errorMessage}`);
    }
  }

  async setupInboundAIConfiguration(): Promise<{ llmId: string; agentId: string }> {
    return this.setupAIConfiguration({});
  }

  async getLLMDetails(llmId: string): Promise<AIPhoneServiceModel<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!llmId?.trim()) {
      throw new Error("LLM ID is required and cannot be empty");
    }

    try {
      return await this.deps.retellRepository.getLLM(llmId);
    } catch (error) {
      this.logger.error(`Failed to get LLM details for '${llmId}'`, {
        llmId,
        error,
        timestamp: new Date().toISOString(),
      });

      throw new Error(`Failed to get LLM details for '${llmId}'`);
    }
  }
}
