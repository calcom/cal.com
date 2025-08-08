import type {
  AIPhoneServiceUpdateModelParams,
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParamsExtended,
  AIPhoneServiceProviderType,
} from "../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../interfaces/TransactionInterface";
import { AIConfigurationService } from "./services/AIConfigurationService";
import { AgentService } from "./services/AgentService";
import { BillingService } from "./services/BillingService";
import { CallService } from "./services/CallService";
import { PhoneNumberService } from "./services/PhoneNumberService";
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
  Language,
} from "./types";

export class RetellAIService {
  private aiConfigurationService: AIConfigurationService;
  private agentService: AgentService;
  private billingService: BillingService;
  private callService: CallService;
  private phoneNumberService: PhoneNumberService;

  constructor(
    private repository: RetellAIRepository,
    private agentRepository: AgentRepositoryInterface,
    private phoneNumberRepository: PhoneNumberRepositoryInterface,
    private transactionManager: TransactionInterface
  ) {
    this.aiConfigurationService = new AIConfigurationService(repository);
    this.agentService = new AgentService(repository, agentRepository);
    this.billingService = new BillingService(phoneNumberRepository, repository);
    this.callService = new CallService(repository, agentRepository);
    this.phoneNumberService = new PhoneNumberService(
      repository,
      agentRepository,
      phoneNumberRepository,
      transactionManager
    );
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

  async createPhoneNumber(data: AIPhoneServiceCreatePhoneNumberParams): Promise<RetellPhoneNumber> {
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

  async createAgent(params: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    generalPrompt?: string;
    beginMessage?: string;
    generalTools?: RetellLLMGeneralTools;
    userTimeZone: string;
  }) {
    return this.agentService.createAgent({
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

  async updateAgentConfiguration(params: {
    id: string;
    userId: number;
    name?: string;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: RetellLLMGeneralTools;
    voiceId?: string;
  }) {
    return this.agentService.updateAgentConfiguration({
      ...params,
      updateLLMConfiguration: (
        llmId: string,
        data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
      ) => this.updateLLMConfiguration(llmId, data),
    });
  }

  async deleteAgent(params: { id: string; userId: number; teamId?: number }) {
    return this.agentService.deleteAgent({
      ...params,
      deleteAIConfiguration: (config) => this.deleteAIConfiguration(config),
    });
  }

  async createPhoneCall(data: {
    from_number: string;
    to_number: string;
    retell_llm_dynamic_variables?: RetellDynamicVariables;
  }): Promise<RetellCall> {
    return this.callService.createPhoneCall(data);
  }

  async createTestCall(params: { agentId: string; phoneNumber?: string; userId: number; teamId?: number }) {
    return this.callService.createTestCall(params);
  }

  async generatePhoneNumberCheckoutSession(params: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
  }) {
    return this.billingService.generatePhoneNumberCheckoutSession(params);
  }

  async cancelPhoneNumberSubscription(params: { phoneNumberId: number; userId: number; teamId?: number }) {
    return this.billingService.cancelPhoneNumberSubscription(params);
  }
}
