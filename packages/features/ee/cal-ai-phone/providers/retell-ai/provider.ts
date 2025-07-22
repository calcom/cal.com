import type {
  AIPhoneServiceProvider,
  AIPhoneServiceConfiguration,
  AIPhoneServiceDeletion,
  AIPhoneServiceDeletionResult,
  AIPhoneServiceCallData,
  AIPhoneServiceModel,
  AIPhoneServiceCall,
  AIPhoneServicePhoneNumber,
} from "../../interfaces/ai-phone-service.interface";
import { RetellAIService } from "./service";
import type { RetellAIRepository } from "./types";

export class RetellAIProvider implements AIPhoneServiceProvider {
  private service: RetellAIService;

  constructor(repository: RetellAIRepository) {
    this.service = new RetellAIService(repository);
  }

  async setupConfiguration(config: AIPhoneServiceConfiguration): Promise<{
    llmId: string;
    agentId: string;
  }> {
    const result = await this.service.setupAIConfiguration({
      calApiKey: config.calApiKey,
      timeZone: config.timeZone,
      eventTypeId: config.eventTypeId,
    });

    return {
      llmId: result.llmId,
      agentId: result.agentId,
    };
  }

  async deleteConfiguration(config: AIPhoneServiceDeletion): Promise<AIPhoneServiceDeletionResult> {
    const result = await this.service.deleteAIConfiguration({
      llmId: config.llmId,
      agentId: config.agentId,
    });

    return {
      success: result.success,
      errors: result.errors,
      deleted: {
        llm: result.deleted.llm,
        agent: result.deleted.agent,
      },
    };
  }

  async updateLLMConfiguration(
    llmId: string,
    data: { generalPrompt?: string; beginMessage?: string }
  ): Promise<AIPhoneServiceModel> {
    const result = await this.service.updateLLMConfiguration(llmId, data);

    return {
      id: result.llm_id,
      generalPrompt: result.general_prompt,
      beginMessage: result.begin_message ?? undefined,
      // Include additional Retell AI specific fields
      llmWebsocketUrl: result.llm_websocket_url,
      generalTools: result.general_tools,
      inboundDynamicVariablesWebhookUrl: result.inbound_dynamic_variables_webhook_url,
    };
  }

  async getLLMDetails(llmId: string): Promise<AIPhoneServiceModel> {
    const result = await this.service.getLLMDetails(llmId);

    return {
      id: result.llm_id,
      generalPrompt: result.general_prompt,
      beginMessage: result.begin_message ?? undefined,
      // Include additional Retell AI specific fields
      llmWebsocketUrl: result.llm_websocket_url,
      generalTools: result.general_tools,
      inboundDynamicVariablesWebhookUrl: result.inbound_dynamic_variables_webhook_url,
    };
  }

  async createPhoneCall(data: AIPhoneServiceCallData): Promise<AIPhoneServiceCall> {
    const result = await this.service.createPhoneCall({
      fromNumber: data.fromNumber,
      toNumber: data.toNumber,
      dynamicVariables: data.dynamicVariables,
    });

    return {
      id: result.call_id,
      agentId: result.agent_id,
      callStatus: result.call_status,
      callType: result.call_type,
      fromNumber: result.from_number,
      toNumber: result.to_number,
      direction: result.direction,
      callAnalysis: result.call_analysis,
      recordingUrl: result.recording_url,
      publicLogUrl: result.public_log_url,
    };
  }

  async createPhoneNumber(data: {
    areaCode?: number;
    nickname?: string;
  }): Promise<AIPhoneServicePhoneNumber> {
    const result = await this.service.createPhoneNumber({
      area_code: data.areaCode,
      nickname: data.nickname,
    });

    return {
      phoneNumber: result.phone_number,
      nickname: result.nickname,
      inboundAgentId: result.inbound_agent_id,
      outboundAgentId: result.outbound_agent_id,
    };
  }

  async importPhoneNumber(data: {
    phoneNumber: string;
    terminationUri: string;
    sipTrunkAuthUsername?: string;
    sipTrunkAuthPassword?: string;
    nickname?: string;
    userId: number;
  }): Promise<{
    phoneNumber: string;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
    nickname?: string | null;
  }> {
    const result = await this.service.importPhoneNumber(data);

    return {
      phoneNumber: result.phone_number,
      inboundAgentId: result.inbound_agent_id,
      outboundAgentId: result.outbound_agent_id,
      nickname: result.nickname,
    };
  }

  async deletePhoneNumber({
    phoneNumber,
    userId,
    deleteFromDB,
  }: {
    phoneNumber: string;
    userId: number;
    deleteFromDB: boolean;
  }): Promise<void> {
    await this.service.deletePhoneNumber({ phoneNumber, userId, deleteFromDB });
  }

  async getPhoneNumber(phoneNumber: string): Promise<AIPhoneServicePhoneNumber> {
    const result = await this.service.getPhoneNumber(phoneNumber);

    return {
      phoneNumber: result.phone_number,
      nickname: result.nickname,
      // Include additional Retell AI specific fields
      inboundAgentId: result.inbound_agent_id,
      outboundAgentId: result.outbound_agent_id,
    };
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inboundAgentId?: string | null; outboundAgentId?: string | null }
  ): Promise<AIPhoneServicePhoneNumber> {
    const result = await this.service.updatePhoneNumber(phoneNumber, {
      inbound_agent_id: data.inboundAgentId,
      outbound_agent_id: data.outboundAgentId,
    });

    return {
      phoneNumber: result.phone_number,
      nickname: result.nickname,
      // Include additional Retell AI specific fields
      inboundAgentId: result.inbound_agent_id,
      outboundAgentId: result.outbound_agent_id,
    };
  }
}
