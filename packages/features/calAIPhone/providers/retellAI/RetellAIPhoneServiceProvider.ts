import type { TrackingData } from "@calcom/lib/tracking";
import type {
  AIPhoneServiceAgent,
  AIPhoneServiceAgentListItem,
  AIPhoneServiceAgentWithDetails,
  AIPhoneServiceCall,
  AIPhoneServiceCallData,
  AIPhoneServiceConfiguration,
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceDeletion,
  AIPhoneServiceDeletionResult,
  AIPhoneServiceImportPhoneNumberParamsExtended,
  AIPhoneServiceModel,
  AIPhoneServicePhoneNumber,
  AIPhoneServiceProvider,
  AIPhoneServiceProviderType,
  AIPhoneServiceTools,
  AIPhoneServiceUpdateAgentParams,
  AIPhoneServiceUpdateModelParams,
  AIPhoneServiceUpdatePhoneNumberParams,
} from "../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../interfaces/TransactionInterface";
import { RetellAIService } from "./RetellAIService";
import type { Language, RetellAIRepository } from "./types";

export class RetellAIPhoneServiceProvider
  implements AIPhoneServiceProvider<AIPhoneServiceProviderType.RETELL_AI>
{
  private service: RetellAIService;

  constructor(
    repository: RetellAIRepository,
    agentRepository: AgentRepositoryInterface,
    phoneNumberRepository: PhoneNumberRepositoryInterface,
    transactionManager: TransactionInterface,
    service?: RetellAIService
  ) {
    this.service =
      service || new RetellAIService(repository, agentRepository, phoneNumberRepository, transactionManager);
  }

  async setupConfiguration(
    config: AIPhoneServiceConfiguration<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<{
    modelId: string;
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
      modelId: result.llmId,
      agentId: result.agentId,
    };
  }

  async deleteConfiguration(config: AIPhoneServiceDeletion): Promise<AIPhoneServiceDeletionResult> {
    const result = await this.service.deleteAIConfiguration({
      llmId: config.modelId,
      agentId: config.agentId,
    });

    return {
      success: result.success,
      errors: result.errors,
      deleted: {
        model: result.deleted.llm,
        agent: result.deleted.agent,
      },
    };
  }

  async updateModelConfiguration(
    modelId: string,
    data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<AIPhoneServiceModel<AIPhoneServiceProviderType.RETELL_AI>> {
    const result = await this.service.updateLLMConfiguration(modelId, data);
    return result;
  }

  async getModelDetails(modelId: string): Promise<AIPhoneServiceModel<AIPhoneServiceProviderType.RETELL_AI>> {
    const result = await this.service.getLLMDetails(modelId);
    return result;
  }

  async getAgent(agentId: string): Promise<AIPhoneServiceAgent<AIPhoneServiceProviderType.RETELL_AI>> {
    const agent = await this.service.getAgent(agentId);
    return agent;
  }

  async updateAgent(
    agentId: string,
    data: AIPhoneServiceUpdateAgentParams<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<AIPhoneServiceAgent<AIPhoneServiceProviderType.RETELL_AI>> {
    const agent = await this.service.updateAgent(agentId, data);
    return agent;
  }

  async createPhoneCall(
    data: AIPhoneServiceCallData<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<AIPhoneServiceCall<AIPhoneServiceProviderType.RETELL_AI>> {
    const result = await this.service.createPhoneCall(data);

    return result;
  }

  async createPhoneNumber(
    data: AIPhoneServiceCreatePhoneNumberParams<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI> & { provider: string }> {
    const result = await this.service.createPhoneNumber({
      area_code: data.area_code,
      nickname: data.nickname,
      inbound_agent_id: data.inbound_agent_id,
      outbound_agent_id: data.outbound_agent_id,
    });

    return result;
  }

  async importPhoneNumber(
    data: AIPhoneServiceImportPhoneNumberParamsExtended<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI>> {
    const result = await this.service.importPhoneNumber(data);
    return result;
  }

  async deletePhoneNumber({
    phoneNumber,
    userId,
    deleteFromDB,
    teamId,
  }: {
    phoneNumber: string;
    userId: number;
    deleteFromDB: boolean;
    teamId?: number;
  }): Promise<void> {
    await this.service.deletePhoneNumber({ phoneNumber, userId, deleteFromDB, teamId });
  }

  async getPhoneNumber(
    phoneNumber: string
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI>> {
    const result = await this.service.getPhoneNumber(phoneNumber);
    return result;
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: AIPhoneServiceUpdatePhoneNumberParams<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI>> {
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
    tracking?: TrackingData;
  }): Promise<{ url: string; message: string }> {
    return await this.service.generatePhoneNumberCheckoutSession(params);
  }

  async cancelPhoneNumberSubscription(params: {
    phoneNumberId: number;
    userId: number;
    teamId?: number;
  }): Promise<{ success: boolean; message: string }> {
    return await this.service.cancelPhoneNumberSubscription(params);
  }

  async updatePhoneNumberWithAgents(params: {
    phoneNumber: string;
    userId: number;
    teamId?: number;
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
    filtered: AIPhoneServiceAgentListItem[];
  }> {
    return await this.service.listAgents(params);
  }

  async getAgentWithDetails(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AIPhoneServiceAgentWithDetails<AIPhoneServiceProviderType.RETELL_AI>> {
    return await this.service.getAgentWithDetails(params);
  }

  async createOutboundAgent(params: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    generalPrompt?: string;
    beginMessage?: string;
    generalTools?: AIPhoneServiceTools<AIPhoneServiceProviderType.RETELL_AI>;
    voiceId?: string;
    userTimeZone: string;
  }): Promise<{
    id: string;
    providerAgentId: string;
    message: string;
  }> {
    const result = await this.service.createOutboundAgent(params);
    return {
      id: result.id,
      providerAgentId: result.providerAgentId,
      message: result.message,
    };
  }

  async createInboundAgent(params: {
    name?: string;
    phoneNumber: string;
    userId: number;
    teamId?: number;
    workflowStepId: number;
    userTimeZone: string;
  }): Promise<{
    id: string;
    providerAgentId: string;
    message: string;
  }> {
    const result = await this.service.createInboundAgent(params);
    return {
      id: result.id,
      providerAgentId: result.providerAgentId,
      message: result.message,
    };
  }

  async updateAgentConfiguration(params: {
    id: string;
    userId: number;
    teamId?: number;
    name?: string;
    enabled?: boolean;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: AIPhoneServiceTools<AIPhoneServiceProviderType.RETELL_AI>;
    voiceId?: string;
    language?: Language;
    outboundEventTypeId?: number;
    timeZone?: string;
  }): Promise<{ message: string }> {
    return await this.service.updateAgentConfiguration(params);
  }

  async deleteAgent(params: { id: string; userId: number; teamId?: number }): Promise<{ message: string }> {
    return await this.service.deleteAgent(params);
  }

  async createTestCall(params: {
    agentId: string;
    phoneNumber?: string;
    userId: number;
    teamId?: number;
    timeZone: string;
    eventTypeId: number;
  }): Promise<{
    callId: string;
    status: string;
    message: string;
  }> {
    return await this.service.createTestCall(params);
  }

  async createWebCall(params: {
    agentId: string;
    userId: number;
    teamId?: number;
    timeZone: string;
    eventTypeId: number;
  }): Promise<{
    callId: string;
    accessToken: string;
    agentId: string;
  }> {
    return await this.service.createWebCall(params);
  }

  async updateToolsFromAgentId(
    agentId: string,
    data: { eventTypeId: number | null; timeZone: string; userId: number | null; teamId?: number | null }
  ): Promise<void> {
    return await this.service.updateToolsFromAgentId(agentId, data);
  }

  async removeToolsForEventTypes(agentId: string, eventTypeIds: number[]): Promise<void> {
    return await this.service.removeToolsForEventTypes(agentId, eventTypeIds);
  }

  async listCalls(params: {
    limit?: number;
    offset?: number;
    filters: {
      fromNumber: string[];
      toNumber?: string[];
      startTimestamp?: { lower_threshold?: number; upper_threshold?: number };
    };
  }) {
    return await this.service.listCalls(params);
  }

  async listVoices() {
    return await this.service.listVoices();
  }
}
