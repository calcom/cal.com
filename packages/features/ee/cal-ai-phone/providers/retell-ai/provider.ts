import type {
  AIPhoneServiceProvider,
  AIPhoneServiceConfiguration,
  AIPhoneServiceDeletion,
  AIPhoneServiceDeletionResult,
  AIPhoneServiceCallData,
  AIPhoneServiceModel,
  AIPhoneServiceCall,
  AIPhoneServicePhoneNumber,
  AIPhoneServiceAgent,
  updateLLMConfigurationParams,
  AIPhoneServiceUpdateAgentParams,
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParams,
  AIPhoneServiceUpdatePhoneNumberParams,
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
      generalPrompt: config.generalPrompt,
      beginMessage: config.beginMessage,
      generalTools: config.generalTools,
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
    data: updateLLMConfigurationParams
  ): Promise<AIPhoneServiceModel> {
    const result = await this.service.updateLLMConfiguration(llmId, data);
    return result;
  }

  async getLLMDetails(llmId: string): Promise<AIPhoneServiceModel> {
    const result = await this.service.getLLMDetails(llmId);
    return result;
  }

  async getAgent(agentId: string): Promise<AIPhoneServiceAgent> {
    const agent = await this.service.getAgent(agentId);
    return agent;
  }

  async updateAgent(agentId: string, data: AIPhoneServiceUpdateAgentParams): Promise<AIPhoneServiceAgent> {
    const agent = await this.service.updateAgent(agentId, data);
    return agent;
  }

  async createPhoneCall(data: AIPhoneServiceCallData): Promise<AIPhoneServiceCall> {
    const result = await this.service.createPhoneCall(data);

    return result;
  }

  async createPhoneNumber(data: AIPhoneServiceCreatePhoneNumberParams): Promise<AIPhoneServicePhoneNumber> {
    const result = await this.service.createPhoneNumber({
      area_code: data.area_code,
      nickname: data.nickname,
      inbound_agent_id: data.inbound_agent_id,
      outbound_agent_id: data.outbound_agent_id,
    });

    return result;
  }

  async importPhoneNumber(data: AIPhoneServiceImportPhoneNumberParams): Promise<AIPhoneServicePhoneNumber> {
    const result = await this.service.importPhoneNumber(data);
    return result;
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
    return result;
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: AIPhoneServiceUpdatePhoneNumberParams
  ): Promise<AIPhoneServicePhoneNumber> {
    const result = await this.service.updatePhoneNumber(phoneNumber, {
      inbound_agent_id: data.inbound_agent_id,
      outbound_agent_id: data.outbound_agent_id,
    });

    return result;
  }

  async generatePhoneNumberCheckoutSession(params: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
  }): Promise<{ url: string; message: string }> {
    return await this.service.generatePhoneNumberCheckoutSession(params);
  }

  async cancelPhoneNumberSubscription(params: {
    phoneNumberId: number;
    userId: number;
  }): Promise<{ success: boolean; message: string }> {
    return await this.service.cancelPhoneNumberSubscription(params);
  }

  async updatePhoneNumberWithAgents(params: {
    phoneNumber: string;
    userId: number;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
  }): Promise<{ message: string }> {
    return await this.service.updatePhoneNumberWithAgents(params);
  }

  async listAgents(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<{
    totalCount: number;
    filtered: any[];
  }> {
    return await this.service.listAgents(params);
  }

  async getAgentWithDetails(params: { id: string; userId: number }): Promise<any> {
    return await this.service.getAgentWithDetails(params);
  }

  async createAgent(params: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    generalPrompt?: string;
    beginMessage?: string;
    generalTools?: any;
    voiceId?: string;
    userTimeZone: string;
  }): Promise<{
    id: string;
    retellAgentId: string;
    message: string;
  }> {
    return await this.service.createAgent(params);
  }

  async updateAgentConfiguration(params: {
    id: string;
    userId: number;
    name?: string;
    enabled?: boolean;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: any;
    voiceId?: string;
  }): Promise<{ message: string }> {
    return await this.service.updateAgentConfiguration(params);
  }

  async deleteAgent(params: { id: string; userId: number }): Promise<{ message: string }> {
    return await this.service.deleteAgent(params);
  }

  async createTestCall(params: { agentId: string; phoneNumber?: string; userId: number }): Promise<{
    callId: string;
    status: string;
    message: string;
  }> {
    return await this.service.createTestCall(params);
  }
}
