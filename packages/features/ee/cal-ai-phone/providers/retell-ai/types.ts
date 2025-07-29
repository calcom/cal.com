import type { Retell } from "retell-sdk";

export type RetellLLM = Retell.LlmResponse;
export type RetellPhoneNumber = Retell.PhoneNumberResponse;
export type RetellCall = Retell.PhoneCallResponse;
export type RetellDynamicVariables = { [key: string]: unknown };

// Use the SDK's AgentResponse directly - no type assertions needed!
export type RetellAgent = Retell.AgentResponse;

// Specific agent types for type narrowing
export type RetellAgentWithRetellLm = Retell.AgentResponse & {
  response_engine: Retell.AgentResponse.ResponseEngineRetellLm;
};

export type RetellAgentWithCustomLm = Retell.AgentResponse & {
  response_engine: Retell.AgentResponse.ResponseEngineCustomLm;
};

export type RetellAgentWithConversationFlow = Retell.AgentResponse & {
  response_engine: Retell.AgentResponse.ResponseEngineConversationFlow;
};

// Type guards for safe access to response engine properties
export function isRetellLmAgent(agent: RetellAgent): agent is RetellAgentWithRetellLm {
  return agent.response_engine.type === "retell-llm";
}

export function isCustomLmAgent(agent: RetellAgent): agent is RetellAgentWithCustomLm {
  return agent.response_engine.type === "custom-llm";
}

export function isConversationFlowAgent(agent: RetellAgent): agent is RetellAgentWithConversationFlow {
  return agent.response_engine.type === "conversation-flow";
}

// Utility function to safely access llm_id (only available for retell-llm agents)
export function getLlmId(agent: RetellAgent): string | null {
  if (isRetellLmAgent(agent)) {
    return agent.response_engine.llm_id;
  }
  return null;
}

// Legacy type alias for backward compatibility
export type LegacyRetellAgent = RetellAgentWithRetellLm;

// Request/response types
export type CreateLLMRequest = Retell.LlmCreateParams;
export type CreatePhoneNumberParams = Retell.PhoneNumberCreateParams;
export type CreatePhoneCallParams = Retell.CallCreatePhoneCallParams;
export type UpdatePhoneNumberParams = Retell.PhoneNumberUpdateParams;
export type ImportPhoneNumberParams = Retell.PhoneNumberImportParams;
export type RetellLLMGeneralTools = Retell.LlmCreateParams["general_tools"];
export type CreateAgentRequest = Retell.AgentCreateParams;
export type UpdateLLMRequest = Retell.LlmUpdateParams;
export type UpdateAgentRequest = Retell.AgentUpdateParams;

export interface AIConfigurationSetup {
  calApiKey?: string;
  timeZone?: string;
  eventTypeId?: number;
  generalPrompt?: string;
  beginMessage?: string;
  generalTools?: Retell.LlmCreateParams["general_tools"];
}

export interface AIConfigurationDeletion {
  llmId?: string;
  agentId?: string;
}

export interface DeletionResult {
  success: boolean;
  errors: string[];
  deleted: {
    llm: boolean;
    agent: boolean;
  };
}

export interface RetellAIRepository {
  // LLM operations
  createLLM(data: CreateLLMRequest): Promise<RetellLLM>;
  getLLM(llmId: string): Promise<RetellLLM>;
  updateLLM(llmId: string, data: UpdateLLMRequest): Promise<RetellLLM>;
  deleteLLM(llmId: string): Promise<void>;

  // Agent operations
  createAgent(data: CreateAgentRequest): Promise<RetellAgent>;
  getAgent(agentId: string): Promise<RetellAgent>;
  updateAgent(agentId: string, data: UpdateAgentRequest): Promise<RetellAgent>;
  deleteAgent(agentId: string): Promise<void>;

  // Phone number operations
  createPhoneNumber(data: CreatePhoneNumberParams): Promise<RetellPhoneNumber>;
  importPhoneNumber(data: ImportPhoneNumberParams): Promise<RetellPhoneNumber>;
  deletePhoneNumber(phoneNumber: string): Promise<void>;
  getPhoneNumber(phoneNumber: string): Promise<RetellPhoneNumber>;
  updatePhoneNumber(phoneNumber: string, data: UpdatePhoneNumberParams): Promise<RetellPhoneNumber>;

  // Call operations
  createPhoneCall(data: CreatePhoneCallParams): Promise<RetellCall>;
}
