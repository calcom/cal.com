import type { Logger } from "tslog";

import type { TrackingData } from "@calcom/lib/tracking";

import type { RetellAIPhoneServiceProviderTypeMap } from "../providers/retellAI";

/**
 * Enum for supported AI phone service providers
 */
export enum AIPhoneServiceProviderType {
  RETELL_AI = "retellAI",
  // Add other providers here as needed
}

/**
 * Generic type map for provider-specific types
 * This allows the interface layer to remain provider-agnostic while supporting type safety
 *
 * Usage examples:
 * - Retell AI provider: AIPhoneServiceProvider<AIPhoneServiceProviderType.RETELL_AI>
 * - Generic usage: AIPhoneServiceProvider (defaults to union of all providers)
 *
 * Providers implement this by exporting a consolidated type map from their module:
 * ```typescript
 * // In providers/retellAI/index.ts
 * export interface RetellAIPhoneServiceProviderTypeMap {
 *   Configuration: RetellAIConfigurationSetup;
 *   Agent: RetellAgent;
 *   AgentWithDetails: RetellAgentWithDetails;
 *   // ... other types
 * }
 *
 * // In interfaces/AIPhoneService.interface.ts
 * import type { RetellAIPhoneServiceProviderTypeMap } from "../providers/retellAI";
 *
 * export interface AIPhoneServiceProviderTypeMap {
 *   [AIPhoneServiceProviderType.RETELL_AI]: RetellAIPhoneServiceProviderTypeMap;
 * }
 * ```
 */
export interface AIPhoneServiceProviderTypeMap {
  [AIPhoneServiceProviderType.RETELL_AI]: RetellAIPhoneServiceProviderTypeMap;
}

/**
 * Generic types that resolve to provider-specific types based on the provider type parameter
 */
export type AIPhoneServiceConfiguration<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["Configuration"];

export type AIPhoneServiceUpdateModelParams<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["UpdateModelParams"];

export type AIPhoneServiceModel<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["Model"];

export type AIPhoneServiceAgent<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["Agent"];

export type AIPhoneServiceCall<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["Call"];

export type AIPhoneServicePhoneNumber<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["PhoneNumber"];

export type AIPhoneServiceUpdatePhoneNumberParams<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["UpdatePhoneNumberParams"];

export type AIPhoneServiceCreatePhoneNumberParams<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["CreatePhoneNumberParams"];

export type AIPhoneServiceImportPhoneNumberParams<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["ImportPhoneNumberParams"];

export type AIPhoneServiceUpdateAgentParams<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["UpdateAgentParams"];

export type AIPhoneServiceTools<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["Tools"];

export type AIPhoneServiceCreatePhoneCallParams<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["CreatePhoneCallParams"];

export type AIPhoneServiceAgentWithDetails<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["AgentWithDetails"];

export type AIPhoneServiceListCallsParams<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["ListCallsParams"];

export type AIPhoneServiceListCallsResponse<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceProviderTypeMap[T]["ListCallsResponse"];

export type AIPhoneServiceVoice<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceProviderTypeMap[T]["Voice"];

export interface AIPhoneServiceDeletion {
  modelId?: string;
  agentId?: string;
}

export interface AIPhoneServiceDeletionResult {
  success: boolean;
  errors: string[];
  deleted: {
    model: boolean;
    agent: boolean;
  };
}

export type AIPhoneServiceCallData<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> =
  AIPhoneServiceCreatePhoneCallParams<T>;

// Extended import phone number params with additional fields
export type AIPhoneServiceImportPhoneNumberParamsExtended<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> = AIPhoneServiceImportPhoneNumberParams<T> & {
  userId: number;
  teamId?: number;
  agentId?: string | null;
};

export interface AIPhoneServiceAgentListItem {
  id: string;
  name: string;
  providerAgentId: string;
  enabled: boolean;
  userId: number | null;
  teamId: number | null;
  createdAt: Date;
  updatedAt: Date;
  outboundPhoneNumbers: {
    id: number;
    phoneNumber: string;
    subscriptionStatus: string | null;
    provider: string | null;
  }[];
  team: {
    id: number;
    name: string | null | undefined;
    slug: string | null | undefined;
  } | null;
  user: {
    id: number;
    name: string | null | undefined;
    email: string | null;
  } | null;
}

/**
 * Generic interface for AI phone service providers
 * This interface abstracts away provider-specific details using generics
 */
export interface AIPhoneServiceProvider<T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType> {
  /**
   * Setup AI configuration
   */
  setupConfiguration(config: AIPhoneServiceConfiguration<T>): Promise<{
    modelId: string;
    agentId: string;
  }>;

  /**
   * Delete AI configuration
   */
  deleteConfiguration(config: AIPhoneServiceDeletion): Promise<AIPhoneServiceDeletionResult>;

  /**
   * Update model configuration
   */
  updateModelConfiguration(
    modelId: string,
    data: AIPhoneServiceUpdateModelParams<T>
  ): Promise<AIPhoneServiceModel<T>>;

  /**
   * Get model details
   */
  getModelDetails(modelId: string): Promise<AIPhoneServiceModel<T>>;

  /**
   * Get agent details
   */
  getAgent(agentId: string): Promise<AIPhoneServiceAgent<T>>;

  /**
   * Update agent configuration
   */
  updateAgent(agentId: string, data: AIPhoneServiceUpdateAgentParams<T>): Promise<AIPhoneServiceAgent<T>>;

  /**
   * Create a phone call
   */
  createPhoneCall(data: AIPhoneServiceCallData<T>): Promise<AIPhoneServiceCall<T>>;

  /**
   * Create a phone number
   */
  createPhoneNumber(
    data: AIPhoneServiceCreatePhoneNumberParams<T>
  ): Promise<AIPhoneServicePhoneNumber<T> & { provider: string }>;

  /**
   * Delete a phone number
   */
  deletePhoneNumber(params: {
    phoneNumber: string;
    userId: number;
    teamId?: number;
    deleteFromDB: boolean;
  }): Promise<void>;

  /**
   * Get phone number details
   */
  getPhoneNumber(phoneNumber: string): Promise<AIPhoneServicePhoneNumber<T>>;

  /**
   * Update phone number configuration
   */
  updatePhoneNumber(
    phoneNumber: string,
    data: AIPhoneServiceUpdatePhoneNumberParams<T>
  ): Promise<AIPhoneServicePhoneNumber<T>>;

  /**
   * Import a phone number
   */
  importPhoneNumber(
    data: AIPhoneServiceImportPhoneNumberParamsExtended<T>
  ): Promise<AIPhoneServicePhoneNumber<T>>;

  /**
   * Generate a checkout session for phone number subscription
   */
  generatePhoneNumberCheckoutSession(params: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
    tracking?: TrackingData;
  }): Promise<{ url: string; message: string }>;

  /**
   * Cancel a phone number subscription
   */
  cancelPhoneNumberSubscription(params: {
    phoneNumberId: number;
    userId: number;
    teamId?: number;
  }): Promise<{ success: boolean; message: string }>;

  /**
   * Update phone number with agent assignments
   */
  updatePhoneNumberWithAgents(params: {
    phoneNumber: string;
    userId: number;
    teamId?: number;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
  }): Promise<{ message: string }>;

  /**
   * List agents with user access
   */
  listAgents(params: { userId: number; teamId?: number; scope?: "personal" | "team" | "all" }): Promise<{
    totalCount: number;
    filtered: AIPhoneServiceAgentListItem[];
  }>;

  /**
   * Get agent with detailed information
   */
  getAgentWithDetails(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AIPhoneServiceAgentWithDetails<T>>;

  /**
   * Create a new agent
   */
  createOutboundAgent(params: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    generalPrompt?: string;
    beginMessage?: string;
    generalTools?: AIPhoneServiceTools<T>;
    voiceId?: string;
    userTimeZone: string;
  }): Promise<{
    id: string;
    providerAgentId: string;
    message: string;
  }>;

  /**
   * Create a new inbound agent
   */
  createInboundAgent(params: {
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
  }>;

  /**
   * Update agent configuration
   */
  updateAgentConfiguration(params: {
    id: string;
    userId: number;
    teamId?: number;
    name?: string;
    enabled?: boolean;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: AIPhoneServiceTools<T>;
    voiceId?: string;
    language?: string;
    outboundEventTypeId?: number;
    timeZone?: string;
  }): Promise<{ message: string }>;

  /**
   * Delete an agent
   */
  deleteAgent(params: { id: string; userId: number; teamId?: number }): Promise<{ message: string }>;

  /**
   * Create a test call
   */
  createTestCall(params: {
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
  }>;

  /**
   * Create a web call
   */
  createWebCall(params: {
    agentId: string;
    userId: number;
    teamId?: number;
    timeZone: string;
    eventTypeId: number;
  }): Promise<{
    callId: string;
    accessToken: string;
    agentId: string;
  }>;

  /**
   * Update tools from event type ID
   */
  updateToolsFromAgentId(
    agentId: string,
    data: { eventTypeId: number | null; timeZone: string; userId: number | null; teamId?: number | null }
  ): Promise<void>;

  /**
   * Remove tools for event types
   */
  removeToolsForEventTypes(agentId: string, eventTypeIds: number[]): Promise<void>;

  /**
   * List calls with optional filters
   */
  listCalls(params: {
    limit?: number;
    offset?: number;
    filters: {
      fromNumber: string[];
      toNumber?: string[];
      startTimestamp?: { lower_threshold?: number; upper_threshold?: number };
    };
  }): Promise<AIPhoneServiceListCallsResponse<T>>;

  /**
   * List available voices
   */
  listVoices(): Promise<AIPhoneServiceVoice<T>[]>;
}

/**
 * Configuration for AI phone service providers
 */
export interface AIPhoneServiceProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  enableLogging?: boolean;
  logger?: Logger<unknown>;
}

/**
 * Factory interface for creating AI phone service providers
 */
export interface AIPhoneServiceProviderFactory<
  T extends AIPhoneServiceProviderType = AIPhoneServiceProviderType,
> {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider<T>;
}
