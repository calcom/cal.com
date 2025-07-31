import type {
  AIConfigurationSetup as RetellAIConfigurationSetup,
  UpdateLLMRequest as RetellAIUpdateLLMParams,
  RetellLLM,
  RetellAgent,
  RetellCall,
  CreatePhoneCallParams,
  RetellPhoneNumber,
  UpdatePhoneNumberParams as RetellAIUpdatePhoneNumberParams,
  CreatePhoneNumberParams as RetellAICreatePhoneNumberParams,
  ImportPhoneNumberParams as RetellAIImportPhoneNumberParams,
  UpdateAgentRequest as RetellAIUpdateAgentParams,
  RetellLLMGeneralTools,
} from "../providers/retell-ai/types";

export type AIPhoneServiceConfiguration = RetellAIConfigurationSetup;
export type updateLLMConfigurationParams = RetellAIUpdateLLMParams;
export type AIPhoneServiceModel = RetellLLM;

export interface AIPhoneServiceDeletion {
  llmId?: string;
  agentId?: string;
}

export interface AIPhoneServiceDeletionResult {
  success: boolean;
  errors: string[];
  deleted: {
    llm: boolean;
    agent: boolean;
  };
}

export type AIPhoneServiceCallData = CreatePhoneCallParams;
export type AIPhoneServiceAgent = RetellAgent;
export type AIPhoneServiceCall = RetellCall;

export type AIPhoneServicePhoneNumber = RetellPhoneNumber;
export type AIPhoneServiceUpdatePhoneNumberParams = RetellAIUpdatePhoneNumberParams;
export type AIPhoneServiceCreatePhoneNumberParams = RetellAICreatePhoneNumberParams;
export type AIPhoneServiceImportPhoneNumberParams = RetellAIImportPhoneNumberParams & {
  userId: number;
  agentId?: string | null;
};
export type AIPhoneServiceUpdateAgentParams = RetellAIUpdateAgentParams;
export type AIPhoneServiceGeneralTool = RetellAIConfigurationSetup["generalTools"];
/**
 * Generic interface for AI phone service providers
 * This interface abstracts away provider-specific details
 */
export interface AIPhoneServiceProvider {
  /**
   * Setup AI configuration
   */
  setupConfiguration(config: AIPhoneServiceConfiguration): Promise<{
    llmId: string;
    agentId: string;
  }>;

  /**
   * Delete AI configuration
   */
  deleteConfiguration(config: AIPhoneServiceDeletion): Promise<AIPhoneServiceDeletionResult>;

  /**
   * Update LLM configuration
   */
  updateLLMConfiguration(llmId: string, data: updateLLMConfigurationParams): Promise<AIPhoneServiceModel>;

  /**
   * Get LLM details
   */
  getLLMDetails(llmId: string): Promise<AIPhoneServiceModel>;

  /**
   * Get agent details
   */
  getAgent(agentId: string): Promise<AIPhoneServiceAgent>;

  /**
   * Update agent configuration
   */
  updateAgent(agentId: string, data: AIPhoneServiceUpdateAgentParams): Promise<AIPhoneServiceAgent>;

  /**
   * Create a phone call
   */
  createPhoneCall(data: AIPhoneServiceCallData): Promise<AIPhoneServiceCall>;

  /**
   * Create a phone number
   */
  createPhoneNumber(data: AIPhoneServiceCreatePhoneNumberParams): Promise<AIPhoneServicePhoneNumber>;

  /**
   * Delete a phone number
   */
  deletePhoneNumber(params: { phoneNumber: string; userId: number; deleteFromDB: boolean }): Promise<void>;

  /**
   * Get phone number details
   */
  getPhoneNumber(phoneNumber: string): Promise<AIPhoneServicePhoneNumber>;

  /**
   * Update phone number configuration
   */
  updatePhoneNumber(
    phoneNumber: string,
    data: AIPhoneServiceUpdatePhoneNumberParams
  ): Promise<AIPhoneServicePhoneNumber>;

  /**
   * Import a phone number
   */
  importPhoneNumber(data: AIPhoneServiceImportPhoneNumberParams): Promise<AIPhoneServicePhoneNumber>;

  /**
   * Generate a checkout session for phone number subscription
   */
  generatePhoneNumberCheckoutSession(params: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
  }): Promise<{ url: string; message: string }>;

  /**
   * Cancel a phone number subscription
   */
  cancelPhoneNumberSubscription(params: {
    phoneNumberId: number;
    userId: number;
  }): Promise<{ success: boolean; message: string }>;

  /**
   * Update phone number with agent assignments
   */
  updatePhoneNumberWithAgents(params: {
    phoneNumber: string;
    userId: number;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
  }): Promise<{ message: string }>;

  /**
   * List agents with user access
   */
  listAgents(params: { userId: number; teamId?: number; scope?: "personal" | "team" | "all" }): Promise<{
    totalCount: number;
    filtered: any[];
  }>;

  /**
   * Get agent with detailed information
   */
  getAgentWithDetails(params: { id: string; userId: number }): Promise<any>;

  /**
   * Create a new agent
   */
  createAgent(params: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    generalPrompt?: string;
    beginMessage?: string;
    generalTools?: RetellLLMGeneralTools;
    voiceId?: string;
    userTimeZone: string;
  }): Promise<{
    id: string;
    retellAgentId: string;
    message: string;
  }>;

  /**
   * Update agent configuration
   */
  updateAgentConfiguration(params: {
    id: string;
    userId: number;
    name?: string;
    enabled?: boolean;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: RetellLLMGeneralTools;
    voiceId?: string;
  }): Promise<{ message: string }>;

  /**
   * Delete an agent
   */
  deleteAgent(params: { id: string; userId: number }): Promise<{ message: string }>;

  /**
   * Create a test call
   */
  createTestCall(params: { agentId: string; phoneNumber?: string; userId: number }): Promise<{
    callId: string;
    status: string;
    message: string;
  }>;
}

/**
 * Configuration for AI phone service providers
 */
export interface AIPhoneServiceProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  enableLogging?: boolean;
  logger?: any; // Logger instance
}

/**
 * Factory interface for creating AI phone service providers
 */
export interface AIPhoneServiceProviderFactory {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider;
}

/**
 * Enum for supported AI phone service providers
 */
export enum AIPhoneServiceProviderType {
  RETELL_AI = "retell-ai",
  // Add other providers here as needed
}
