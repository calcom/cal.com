import type { TrackingData } from "@calcom/lib/tracking";
import type {
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParamsExtended,
  AIPhoneServiceProviderType,
  AIPhoneServiceUpdateModelParams,
} from "../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../interfaces/TransactionInterface";
import { AgentService } from "./services/AgentService";
import { AIConfigurationService } from "./services/AIConfigurationService";
import { BillingService } from "./services/BillingService";
import { CallService } from "./services/CallService";
import { PhoneNumberService } from "./services/PhoneNumberService";
import { VoiceService } from "./services/VoiceService";
import type {
  AIConfigurationDeletion,
  AIConfigurationSetup,
  DeletionResult,
  Language,
  RetellAgent,
  RetellAIRepository,
  RetellCall,
  RetellDynamicVariables,
  RetellLLM,
  RetellLLMGeneralTools,
  RetellPhoneNumber,
} from "./types";

export class RetellAIService {
  private aiConfigurationService: AIConfigurationService;
  private agentService: AgentService;
  private billingService: BillingService;
  private callService: CallService;
  private phoneNumberService: PhoneNumberService;
  private voiceService: VoiceService;

  constructor(
    private repository: RetellAIRepository,
    private agentRepository: AgentRepositoryInterface,
    private phoneNumberRepository: PhoneNumberRepositoryInterface,
    private transactionManager: TransactionInterface
  ) {
    this.aiConfigurationService = new AIConfigurationService({ retellRepository: repository });
    this.agentService = new AgentService({
      retellRepository: repository,
      agentRepository,
      phoneNumberRepository,
    });
    this.billingService = new BillingService({
      phoneNumberRepository,
      retellRepository: repository,
    });
    this.callService = new CallService({
      retellRepository: repository,
      agentRepository,
    });
    this.phoneNumberService = new PhoneNumberService({
      retellRepository: repository,
      agentRepository,
      phoneNumberRepository,
      transactionManager,
    });
    this.voiceService = new VoiceService({ retellRepository: repository });

    // Inject RetellAIService reference into CallService
    this.callService.setRetellAIService(this);
  }

  async setupAIConfiguration(config: AIConfigurationSetup): Promise<{ llmId: string; agentId: string }> {
    return this.aiConfigurationService.setupAIConfiguration(config);
  }

  async deleteAIConfiguration(config: AIConfigurationDeletion): Promise<DeletionResult> {
    return this.aiConfigurationService.deleteAIConfiguration(config);
  }

  async updateLLMConfiguration(
    llmId: string,
    data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
  ): Promise<RetellLLM> {
    return this.aiConfigurationService.updateLLMConfiguration(llmId, data);
  }

  async getLLMDetails(llmId: string): Promise<RetellLLM> {
    return this.aiConfigurationService.getLLMDetails(llmId);
  }

  async importPhoneNumber(data: AIPhoneServiceImportPhoneNumberParamsExtended): Promise<RetellPhoneNumber> {
    return this.phoneNumberService.importPhoneNumber(data);
  }

  async createPhoneNumber(
    data: AIPhoneServiceCreatePhoneNumberParams
  ): Promise<RetellPhoneNumber & { provider: string }> {
    return this.phoneNumberService.createPhoneNumber(data);
  }

  async deletePhoneNumber(params: {
    phoneNumber: string;
    userId: number;
    teamId?: number;
    deleteFromDB: boolean;
  }): Promise<void> {
    return this.phoneNumberService.deletePhoneNumber(params);
  }

  async getPhoneNumber(phoneNumber: string): Promise<RetellPhoneNumber> {
    return this.phoneNumberService.getPhoneNumber(phoneNumber);
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string | null; outbound_agent_id?: string | null }
  ): Promise<RetellPhoneNumber> {
    return this.phoneNumberService.updatePhoneNumber(phoneNumber, data);
  }

  async updatePhoneNumberWithAgents(params: {
    phoneNumber: string;
    userId: number;
    teamId?: number;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
  }) {
    return this.phoneNumberService.updatePhoneNumberWithAgents(params);
  }

  async getAgent(agentId: string): Promise<RetellAgent> {
    return this.agentService.getAgent(agentId);
  }

  async updateAgent(
    agentId: string,
    data: {
      agent_name?: string | null;
      voice_id?: string;
      language?: Language;
      responsiveness?: number;
      interruption_sensitivity?: number;
    }
  ): Promise<RetellAgent> {
    return this.agentService.updateAgent(agentId, data);
  }

  async listAgents(params: { userId: number; teamId?: number; scope?: "personal" | "team" | "all" }) {
    return this.agentService.listAgents(params);
  }

  async getAgentWithDetails(params: { id: string; userId: number; teamId?: number }) {
    return this.agentService.getAgentWithDetails(params);
  }

  async createOutboundAgent(params: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    generalPrompt?: string;
    beginMessage?: string;
    generalTools?: RetellLLMGeneralTools;
    userTimeZone: string;
  }) {
    return this.agentService.createOutboundAgent({
      ...params,
      setupAIConfiguration: () =>
        this.setupAIConfiguration({
          calApiKey: undefined,
          timeZone: params.userTimeZone,
          eventTypeId: undefined,
          generalPrompt: params.generalPrompt,
          beginMessage: params.beginMessage,
          generalTools: params.generalTools,
        }),
    });
  }

  async createInboundAgent(params: {
    name?: string;
    phoneNumber: string;
    userId: number;
    teamId?: number;
    workflowStepId: number;
    userTimeZone: string;
  }) {
    return this.agentService.createInboundAgent({
      ...params,
      aiConfigurationService: this.aiConfigurationService,
    });
  }

  async updateAgentConfiguration(params: {
    id: string;
    userId: number;
    teamId?: number;
    name?: string;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: RetellLLMGeneralTools;
    voiceId?: string;
    language?: Language;
    outboundEventTypeId?: number;
    timeZone?: string;
  }) {
    return this.agentService.updateAgentConfiguration({
      ...params,
      updateLLMConfiguration: (
        llmId: string,
        data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
      ) => this.updateLLMConfiguration(llmId, data),
    });
  }

  async updateToolsFromAgentId(
    agentId: string,
    data: { eventTypeId: number | null; timeZone: string; userId: number | null; teamId?: number | null }
  ): Promise<void> {
    return this.agentService.updateToolsFromAgentId(agentId, data);
  }

  async removeToolsForEventTypes(agentId: string, eventTypeIds: number[]): Promise<void> {
    return this.agentService.removeToolsForEventTypes(agentId, eventTypeIds);
  }

  async deleteAgent(params: { id: string; userId: number; teamId?: number }) {
    return this.agentService.deleteAgent({
      ...params,
      deleteAIConfiguration: async (config) => {
        await this.deleteAIConfiguration(config);
      },
    });
  }

  async createPhoneCall(data: {
    fromNumber: string;
    toNumber: string;
    dynamicVariables?: RetellDynamicVariables;
  }): Promise<RetellCall> {
    return this.callService.createPhoneCall(data);
  }

  async createTestCall(params: {
    agentId: string;
    phoneNumber?: string;
    userId: number;
    teamId?: number;
    timeZone: string;
    eventTypeId: number;
  }) {
    return this.callService.createTestCall(params);
  }

  async createWebCall(params: {
    agentId: string;
    userId: number;
    teamId?: number;
    timeZone: string;
    eventTypeId: number;
  }) {
    return this.callService.createWebCall(params);
  }

  async generatePhoneNumberCheckoutSession(params: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
    tracking?: TrackingData;
  }) {
    return this.billingService.generatePhoneNumberCheckoutSession(params);
  }

  async cancelPhoneNumberSubscription(params: { phoneNumberId: number; userId: number; teamId?: number }) {
    return this.billingService.cancelPhoneNumberSubscription(params);
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
    return this.callService.listCalls(params);
  }

  async listVoices() {
    return this.voiceService.listVoices();
  }
}
