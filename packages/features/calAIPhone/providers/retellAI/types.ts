import type { PrismaAgentRepository } from "@calcom/features/calAIPhone/repositories/PrismaAgentRepository";
import type { Retell } from "retell-sdk";

export type RetellLLM = Retell.LlmResponse;
export type RetellPhoneNumber = Retell.PhoneNumberResponse;
export type RetellCall = Retell.PhoneCallResponse;
export type RetellDynamicVariables = { [key: string]: unknown };
export type RetellVoice = Retell.VoiceResponse;

export type RetellAgent = Retell.AgentResponse;

// Call list types
export type RetellCallListParams = Retell.CallListParams;
export type RetellCallListResponse = Retell.CallListResponse;

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

export function getLlmId(agent: RetellAgent): string | null {
  if (isRetellLmAgent(agent)) {
    return agent.response_engine.llm_id;
  }
  return null;
}

export type Language =
  | "en-US"
  | "en-IN"
  | "en-GB"
  | "en-AU"
  | "en-NZ"
  | "de-DE"
  | "es-ES"
  | "es-419"
  | "hi-IN"
  | "fr-FR"
  | "fr-CA"
  | "ja-JP"
  | "pt-PT"
  | "pt-BR"
  | "zh-CN"
  | "ru-RU"
  | "it-IT"
  | "ko-KR"
  | "nl-NL"
  | "nl-BE"
  | "pl-PL"
  | "tr-TR"
  | "th-TH"
  | "vi-VN"
  | "ro-RO"
  | "bg-BG"
  | "ca-ES"
  | "da-DK"
  | "fi-FI"
  | "el-GR"
  | "hu-HU"
  | "id-ID"
  | "no-NO"
  | "sk-SK"
  | "sv-SE"
  | "multi";
// Request/response types
export type CreateLLMRequest = Retell.LlmCreateParams;
export type CreatePhoneNumberParams = Retell.PhoneNumberCreateParams;
export type CreatePhoneCallParams = {
  fromNumber: string;
  toNumber: string;
  dynamicVariables?: RetellDynamicVariables;
};

export type CreateWebCallParams = {
  agentId: string;
  dynamicVariables?: RetellDynamicVariables;
};
export type UpdatePhoneNumberParams = Retell.PhoneNumberUpdateParams;
export type ImportPhoneNumberParams = Retell.PhoneNumberImportParams;
export type RetellLLMGeneralTools = Retell.LlmCreateParams["general_tools"];
export type CreateAgentRequest = Retell.AgentCreateParams;
export type UpdateLLMRequest = Retell.LlmUpdateParams;
export type UpdateAgentRequest = Retell.AgentUpdateParams;
export type Agent = NonNullable<
  Awaited<ReturnType<PrismaAgentRepository["findByIdWithUserAccessAndDetails"]>>
>;

export type RetellAgentWithDetails = {
  id: string;
  name: string;
  providerAgentId: string;
  enabled: boolean;
  userId: number | null;
  teamId: number | null;
  inboundEventTypeId?: number | null;
  outboundEventTypeId?: number | null;
  outboundPhoneNumbers: Array<{
    id: number;
    phoneNumber: string;
    subscriptionStatus: string | null;
    provider: string | null;
  }>;
  retellData: {
    agentId: RetellAgent["agent_id"];
    agentName: RetellAgent["agent_name"];
    voiceId: RetellAgent["voice_id"];
    responseEngine: RetellAgent["response_engine"];
    language: RetellAgent["language"];
    responsiveness: RetellAgent["responsiveness"];
    interruptionSensitivity: RetellAgent["interruption_sensitivity"];
    generalPrompt: RetellLLM["general_prompt"];
    beginMessage: RetellLLM["begin_message"];
    generalTools: RetellLLM["general_tools"];
    llmId: RetellLLM["llm_id"];
  };
  createdAt: Date;
  updatedAt: Date;
};

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
  createOutboundAgent(data: CreateAgentRequest): Promise<RetellAgent>;
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

  listCalls(params: RetellCallListParams): Promise<RetellCallListResponse>;

  createWebCall(
    data: CreateWebCallParams
  ): Promise<{ call_id: string; access_token: string; agent_id: string }>;

  // Voice operations
  listVoices(): Promise<RetellVoice[]>;
}
