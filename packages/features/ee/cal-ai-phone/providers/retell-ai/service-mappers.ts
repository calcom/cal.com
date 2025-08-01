/**
 * Service layer mappers for RetellAI
 * Maps between service/interface types and internal Retell types
 */
import type {
  AIPhoneServiceConfiguration,
  AIPhoneServiceUpdateModelParams,
  AIPhoneServiceTools,
} from "../../interfaces/ai-phone-service.interface";
import type {
  RetellLLMGeneralTools,
  UpdateLLMRequest,
  CreateLLMRequest,
  CreateAgentRequest,
  UpdateAgentRequest,
} from "./types";

export type Language =
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

export class RetellServiceMapper {
  /**
   * Maps AI configuration to Retell tools format
   */
  static buildGeneralTools(config: AIPhoneServiceConfiguration): NonNullable<RetellLLMGeneralTools> {
    const tools: NonNullable<RetellLLMGeneralTools> = [
      {
        type: "end_call",
        name: "end_call",
        description: "Hang up the call, triggered only after appointment successfully scheduled.",
      },
    ];

    // Add calendar tools if configured
    if (config.calApiKey && config.eventTypeId && config.timeZone) {
      tools.push(
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
        }
      );
    }

    // Add any additional tools from config
    if (config.generalTools) {
      tools.push(...config.generalTools);
    }

    return tools;
  }

  /**
   * Maps AI configuration to CreateLLMRequest
   */
  static mapToCreateLLMRequest(
    config: AIPhoneServiceConfiguration,
    generalTools: RetellLLMGeneralTools
  ): CreateLLMRequest {
    return {
      general_prompt: config.generalPrompt,
      begin_message: config.beginMessage,
      general_tools: generalTools,
    };
  }

  /**
   * Maps AI configuration to CreateAgentRequest
   */
  static mapToCreateAgentRequest(
    llmId: string,
    eventTypeId?: number,
    voiceId = "11labs-Adrian"
  ): CreateAgentRequest {
    return {
      response_engine: { llm_id: llmId, type: "retell-llm" },
      agent_name: `agent-${eventTypeId || "default"}-${Date.now()}`,
      voice_id: voiceId,
    };
  }

  /**
   * Maps update model params to Retell format
   */
  static mapToUpdateLLMRequest(data: AIPhoneServiceUpdateModelParams): UpdateLLMRequest {
    return {
      general_prompt: data.general_prompt,
      begin_message: data.begin_message,
      general_tools: data.general_tools ?? null,
    };
  }

  /**
   * Maps agent update data to Retell format
   */
  static mapToUpdateAgentRequest(data: {
    agent_name?: string;
    voice_id?: string;
    language?: Language;
    responsiveness?: number;
    interruption_sensitivity?: number;
  }): UpdateAgentRequest {
    return data;
  }

  /**
   * Maps phone number update data
   */
  static mapPhoneNumberUpdateData(
    inboundAgentId?: string | null,
    outboundAgentId?: string | null
  ): { inbound_agent_id?: string | null; outbound_agent_id?: string | null } {
    const updateData: { inbound_agent_id?: string | null; outbound_agent_id?: string | null } = {};

    if (inboundAgentId !== undefined) {
      updateData.inbound_agent_id = inboundAgentId;
    }

    if (outboundAgentId !== undefined) {
      updateData.outbound_agent_id = outboundAgentId;
    }

    return updateData;
  }

  /**
   * Format agent for listing response
   */
  static formatAgentForList(agent: any) {
    return {
      id: agent.id,
      name: agent.name,
      retellAgentId: agent.retellAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      outboundPhoneNumbers: agent.outboundPhoneNumbers,
      team: agent.team,
      user: agent.user,
    };
  }

  /**
   * Format agent details response
   */
  static formatAgentDetails(agent: any, retellAgent: any, llmDetails: any) {
    return {
      id: agent.id,
      name: agent.name,
      retellAgentId: agent.retellAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      outboundPhoneNumbers: agent.outboundPhoneNumbers,
      retellData: {
        agentId: retellAgent.agent_id,
        agentName: retellAgent.agent_name,
        voiceId: retellAgent.voice_id,
        responseEngine: retellAgent.response_engine,
        language: retellAgent.language,
        responsiveness: retellAgent.responsiveness,
        interruptionSensitivity: retellAgent.interruption_sensitivity,
        generalPrompt: llmDetails.general_prompt,
        beginMessage: llmDetails.begin_message,
        generalTools: llmDetails.general_tools,
        llmId: llmDetails.llm_id,
      },
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  /**
   * Extract LLM update data from params
   */
  static extractLLMUpdateData(
    generalPrompt?: string | null,
    beginMessage?: string | null,
    generalTools?: AIPhoneServiceTools
  ): UpdateLLMRequest {
    return {
      general_prompt: generalPrompt,
      begin_message: beginMessage,
      general_tools: generalTools,
    };
  }
}
