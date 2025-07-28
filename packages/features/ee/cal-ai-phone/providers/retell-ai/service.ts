import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type {
  updateLLMConfigurationParams,
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParams,
} from "../../interfaces/ai-phone-service.interface";
import { DEFAULT_BEGIN_MESSAGE, DEFAULT_PROMPT_VALUE } from "../../promptTemplates";
import { RetellAIError } from "./errors";
import type {
  RetellLLM,
  RetellCall,
  RetellAgent,
  RetellPhoneNumber,
  RetellDynamicVariables,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
  RetellAIRepository,
  RetellLLMGeneralTools,
} from "./types";

export class RetellAIService {
  constructor(private repository: RetellAIRepository) {}

  async setupAIConfiguration(config: AIConfigurationSetup): Promise<{ llmId: string; agentId: string }> {
    const generalTools: NonNullable<RetellLLMGeneralTools> = [
      {
        type: "end_call",
        name: "end_call",
        description: "Hang up the call, triggered only after appointment successfully scheduled.",
      },
      ...(config.calApiKey && config.eventTypeId && config.timeZone
        ? [
            {
              type: "check_availability_cal" as const,
              name: "check_availability",
              cal_api_key: config.calApiKey,
              event_type_id: config.eventTypeId,
              timezone: config.timeZone,
            },
            {
              type: "book_appointment_cal" as const,
              name: "book_appointment",
              cal_api_key: config.calApiKey,
              event_type_id: config.eventTypeId,
              timezone: config.timeZone,
            },
          ]
        : []),
    ];

    if (config.generalTools) {
      generalTools.push(...config.generalTools);
    }

    const llm = await this.repository.createLLM({
      general_prompt: config.generalPrompt || DEFAULT_PROMPT_VALUE,
      begin_message: config.beginMessage || DEFAULT_BEGIN_MESSAGE,
      general_tools: generalTools,
    });

    const agent = await this.repository.createAgent({
      response_engine: { llm_id: llm.llm_id, type: "retell-llm" },
      agent_name: `agent-${config.eventTypeId}-${Date.now()}`,
      // Can be configured in the future
      voice_id: "11labs-Adrian",
    });

    return { llmId: llm.llm_id, agentId: agent.agent_id };
  }

  async importPhoneNumber(data: AIPhoneServiceImportPhoneNumberParams): Promise<RetellPhoneNumber> {
    const { userId, ...rest } = data;
    const importedPhoneNumber = await this.repository.importPhoneNumber({
      phone_number: rest.phone_number,
      termination_uri: rest.termination_uri,
      sip_trunk_auth_username: rest.sip_trunk_auth_username,
      sip_trunk_auth_password: rest.sip_trunk_auth_password,
      nickname: rest.nickname,
    });
    const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
    await PhoneNumberRepository.createPhoneNumber({
      phoneNumber: importedPhoneNumber.phone_number,
      userId,
      provider: "Custom telephony",
    });

    return importedPhoneNumber;
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
  async updateLLMConfiguration(llmId: string, data: updateLLMConfigurationParams): Promise<RetellLLM> {
    return this.repository.updateLLM(llmId, {
      general_prompt: data.general_prompt,
      begin_message: data.begin_message,
      general_tools: data.general_tools ?? null,
    });
  }

  async getLLMDetails(llmId: string): Promise<RetellLLM> {
    return this.repository.getLLM(llmId);
  }

  async getAgent(agentId: string): Promise<RetellAgent> {
    return this.repository.getAgent(agentId);
  }

  async updateAgent(
    agentId: string,
    data: {
      agent_name?: string;
      voice_id?: string;
      language?:
        | "en-US"
        | "en-IN"
        | "en-GB"
        | "en-AU"
        | "en-NZ"
        | "de-DE"
        | "es-ES"
        | "es-419"
        | "hi-IN"
        | "fr-FR"
        | "fr-CA"
        | "ja-JP"
        | "pt-PT"
        | "pt-BR"
        | "zh-CN"
        | "ru-RU"
        | "it-IT"
        | "ko-KR"
        | "nl-NL"
        | "nl-BE"
        | "pl-PL"
        | "tr-TR"
        | "th-TH"
        | "vi-VN"
        | "ro-RO"
        | "bg-BG"
        | "ca-ES"
        | "da-DK"
        | "fi-FI"
        | "el-GR"
        | "hu-HU"
        | "id-ID"
        | "no-NO"
        | "sk-SK"
        | "sv-SE"
        | "multi";
      responsiveness?: number;
      interruption_sensitivity?: number;
    }
  ): Promise<RetellAgent> {
    return this.repository.updateAgent(agentId, data);
  }

  async createPhoneCall(data: {
    from_number: string;
    to_number: string;
    retell_llm_dynamic_variables?: RetellDynamicVariables;
  }): Promise<RetellCall> {
    return this.repository.createPhoneCall({
      from_number: data.from_number,
      to_number: data.to_number,
      retell_llm_dynamic_variables: data.retell_llm_dynamic_variables,
    });
  }

  async createPhoneNumber(data: AIPhoneServiceCreatePhoneNumberParams): Promise<RetellPhoneNumber> {
    return this.repository.createPhoneNumber(data);
  }

  async deletePhoneNumber({
    phoneNumber,
    userId,
    deleteFromDB = false,
  }: {
    phoneNumber: string;
    userId: number;
    deleteFromDB: boolean;
  }): Promise<void> {
    const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");

    const phoneNumberToDelete = await PhoneNumberRepository.findMinimalPhoneNumber({
      phoneNumber,
      userId,
    });
    if (phoneNumberToDelete.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE) {
      throw new Error("Phone number is still active");
    }
    if (phoneNumberToDelete.subscriptionStatus === PhoneNumberSubscriptionStatus.CANCELLED) {
      throw new Error("Phone number is already cancelled");
    }

    if (deleteFromDB) {
      await PhoneNumberRepository.deletePhoneNumber({ phoneNumber, userId });
    }

    await this.repository.deletePhoneNumber(phoneNumber);
  }

  async getPhoneNumber(phoneNumber: string): Promise<RetellPhoneNumber> {
    return this.repository.getPhoneNumber(phoneNumber);
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string | null; outbound_agent_id?: string | null }
  ): Promise<RetellPhoneNumber> {
    return this.repository.updatePhoneNumber(phoneNumber, data);
  }
}
