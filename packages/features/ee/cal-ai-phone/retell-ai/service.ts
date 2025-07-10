import { DEFAULT_BEGIN_MESSAGE, DEFAULT_PROMPT_VALUE } from "../promptTemplates";
import type { TGetRetellLLMSchema, TCreatePhoneSchema } from "../zod-utils";
import { RetellAIError } from "./errors";
import type {
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
  RetellAIRepository,
} from "./types";

export class RetellAIService {
  constructor(private repository: RetellAIRepository) {}

  async setupAIConfiguration(config: AIConfigurationSetup): Promise<{ llmId: string; agentId: string }> {
    const llm = await this.repository.createLLM({
      general_prompt: DEFAULT_PROMPT_VALUE,
      begin_message: DEFAULT_BEGIN_MESSAGE,
      general_tools: [
        {
          type: "end_call",
          name: "end_call",
          description: "Hang up the call, triggered only after appointment successfully scheduled.",
        },
        {
          type: "check_availability_cal",
          name: "check_availability",
          cal_api_key: config.calApiKey,
          event_type_id: config.eventTypeId,
          timezone: config.timeZone,
          // event_type_id: 297707,
        },
        {
          type: "book_appointment_cal",
          name: "book_appointment",
          cal_api_key: config.calApiKey,
          event_type_id: config.eventTypeId,
          // event_type_id: 297707,
          timezone: config.timeZone,
        },
      ],
    });

    const agent = await this.repository.createAgent({
      response_engine: { llm_id: llm.llm_id, type: "retell-llm" },
      agent_name: `agent-${config.eventTypeId}-${Date.now()}`,
      voice_id: "11labs-Adrian",
    });

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

    // Delete agent first (depends on LLM)
    if (config.agentId) {
      try {
        await this.repository.deleteAgent(config.agentId);
        result.deleted.agent = true;
      } catch (error) {
        const errorMessage =
          error instanceof RetellAIError ? error.message : `Failed to delete agent: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;

        // If it's a "not found" error, consider it successful
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          result.deleted.agent = true;
          result.success = true;
          result.errors.pop(); // Remove the error
        }
      }
    } else {
      result.deleted.agent = true; // No agent to delete
    }

    // Delete LLM
    if (config.llmId) {
      try {
        await this.repository.deleteLLM(config.llmId);
        result.deleted.llm = true;
      } catch (error) {
        const errorMessage =
          error instanceof RetellAIError ? error.message : `Failed to delete LLM: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;

        // If it's a "not found" error, consider it successful
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          result.deleted.llm = true;
          result.success = true;
          result.errors.pop(); // Remove the error
        }
      }
    } else {
      result.deleted.llm = true; // No LLM to delete
    }

    return result;
  }

  /**
   * Update LLM configuration (for existing configurations)
   */
  async updateLLMConfiguration(
    llmId: string,
    data: { generalPrompt?: string; beginMessage?: string }
  ): Promise<TGetRetellLLMSchema> {
    return this.repository.updateLLM(llmId, {
      general_prompt: data.generalPrompt,
      begin_message: data.beginMessage,
    });
  }

  /**
   * Get LLM details
   */
  async getLLMDetails(llmId: string): Promise<TGetRetellLLMSchema> {
    return this.repository.getLLM(llmId);
  }

  /**
   * Create a phone call with proper error handling
   */
  async createPhoneCall(data: {
    fromNumber: string;
    toNumber: string;
    dynamicVariables?: {
      name?: string;
      company?: string;
      email?: string;
    };
  }): Promise<TCreatePhoneSchema> {
    return this.repository.createPhoneCall({
      from_number: data.fromNumber,
      to_number: data.toNumber,
      retell_llm_dynamic_variables: data.dynamicVariables,
    });
  }
}
