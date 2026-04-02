/**
 * Service layer mappers for RetellAI
 * Maps between service/interface types and internal Retell types
 */
import type {
  AIPhoneServiceConfiguration,
  AIPhoneServiceProviderType,
  AIPhoneServiceTools,
  AIPhoneServiceUpdateModelParams,
} from "../../interfaces/AIPhoneService.interface";
import type { AgentWithDetailsData } from "../interfaces/AgentRepositoryInterface";
import type {
  CreateAgentRequest,
  CreateLLMRequest,
  Language,
  RetellAgent,
  RetellAgentWithDetails,
  RetellLLM,
  RetellLLMGeneralTools,
  UpdateAgentRequest,
  UpdateLLMRequest,
} from "./types";

export class RetellAIServiceMapper {
  /**
   * Maps AI configuration to Retell tools format
   */
  static buildGeneralTools(
    config: AIPhoneServiceConfiguration<AIPhoneServiceProviderType.RETELL_AI>
  ): NonNullable<RetellLLMGeneralTools> {
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
  static mapToUpdateLLMRequest(
    data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
  ): UpdateLLMRequest {
    return {
      general_prompt: data.general_prompt,
      begin_message: data.begin_message,
      general_tools: data.general_tools ?? undefined,
    };
  }

  /**
   * Maps agent update data to Retell format
   */
  static mapToUpdateAgentRequest(data: {
    agent_name?: string | null;
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
  static formatAgentForList(agent: AgentWithDetailsData) {
    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
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
  static formatAgentDetails(
    agent: AgentWithDetailsData,
    retellAgent: RetellAgent,
    llmDetails: RetellLLM
  ): RetellAgentWithDetails {
    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      inboundEventTypeId: agent.inboundEventTypeId,
      outboundEventTypeId: agent.outboundEventTypeId,
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
    generalTools?: AIPhoneServiceTools<AIPhoneServiceProviderType.RETELL_AI>
  ): UpdateLLMRequest {
    return {
      general_prompt: generalPrompt,
      begin_message: beginMessage,
      general_tools: generalTools,
    };
  }
}
