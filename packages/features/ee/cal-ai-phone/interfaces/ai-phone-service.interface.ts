export interface AIPhoneServiceConfiguration {
  calApiKey: string;
  timeZone: string;
  eventTypeId: number;
}

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

export interface AIPhoneServiceCallData {
  fromNumber: string;
  toNumber: string;
  dynamicVariables?: {
    name?: string;
    company?: string;
    email?: string;
  };
}

export interface AIPhoneServiceModel {
  id: string;
  generalPrompt?: string;
  beginMessage?: string;
  [key: string]: any; // Allow additional provider-specific fields
}

export interface AIPhoneServiceAgent {
  id: string;
  name: string;
  [key: string]: any; // Allow additional provider-specific fields
}

export interface AIPhoneServiceCall {
  id: string;
  agentId?: string;
  [key: string]: any; // Allow additional provider-specific fields
}

export interface AIPhoneServicePhoneNumber {
  phoneNumber: string;
  nickname?: string;
  [key: string]: any; // Allow additional provider-specific fields
}

/**
 * Generic interface for AI phone service providers
 * This interface abstracts away provider-specific details
 */
export interface AIPhoneServiceProvider {
  /**
   * Setup AI configuration for a given event type
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
  updateLLMConfiguration(
    llmId: string,
    data: { generalPrompt?: string; beginMessage?: string }
  ): Promise<AIPhoneServiceModel>;

  /**
   * Get LLM details
   */
  getLLMDetails(llmId: string): Promise<AIPhoneServiceModel>;

  /**
   * Create a phone call
   */
  createPhoneCall(data: AIPhoneServiceCallData): Promise<AIPhoneServiceCall>;

  /**
   * Create a phone number
   */
  createPhoneNumber(data?: { areaCode?: number; nickname?: string }): Promise<AIPhoneServicePhoneNumber>;

  /**
   * Delete a phone number
   */
  deletePhoneNumber(phoneNumber: string): Promise<void>;

  /**
   * Get phone number details
   */
  getPhoneNumber(phoneNumber: string): Promise<AIPhoneServicePhoneNumber>;

  /**
   * Update phone number configuration
   */
  updatePhoneNumber(
    phoneNumber: string,
    data: { inboundAgentId?: string; outboundAgentId?: string }
  ): Promise<AIPhoneServicePhoneNumber>;
}

/**
 * Configuration for AI phone service providers
 */
export interface AIPhoneServiceProviderConfig {
  apiKey: string;
  baseUrl?: string;
  enableLogging?: boolean;
  [key: string]: any; // Allow additional provider-specific config
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
