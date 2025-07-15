import type {
  TCreateRetellLLMSchema,
  TGetRetellLLMSchema,
  TCreatePhoneSchema,
  TCreatePhoneNumberResponseSchema,
  TCreateAgentResponseSchema,
  TUpdatePhoneNumberResponseSchema,
  TGetPhoneNumberSchema,
} from "../../zod-utils";

export interface CreateLLMRequest {
  general_prompt: string;
  begin_message: string;
  general_tools: Array<{
    type: string;
    name: string;
    description?: string;
    cal_api_key?: string;
    event_type_id?: number;
    timezone?: string;
  }>;
}

export interface CreateAgentRequest {
  response_engine: {
    llm_id: string;
    type: string;
  };
  agent_name: string;
  voice_id: string;
}

export interface UpdateLLMRequest {
  general_prompt?: string;
  begin_message?: string;
}

export interface AIConfigurationSetup {
  calApiKey: string;
  timeZone: string;
  eventTypeId: number;
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
  createLLM(data: CreateLLMRequest): Promise<TCreateRetellLLMSchema>;
  getLLM(llmId: string): Promise<TGetRetellLLMSchema>;
  updateLLM(llmId: string, data: UpdateLLMRequest): Promise<TGetRetellLLMSchema>;
  deleteLLM(llmId: string): Promise<void>;

  createAgent(data: CreateAgentRequest): Promise<TCreateAgentResponseSchema>;
  deleteAgent(agentId: string): Promise<void>;

  createPhoneNumber(data: {
    area_code?: number;
    nickname?: string;
  }): Promise<TCreatePhoneNumberResponseSchema>;
  importPhoneNumber(data: {
    phone_number: string;
    termination_uri: string;
    sip_trunk_auth_username?: string;
    sip_trunk_auth_password?: string;
    nickname?: string;
    inbound_webhook_url?: string;
  }): Promise<TCreatePhoneNumberResponseSchema>;
  deletePhoneNumber(phoneNumber: string): Promise<void>;
  getPhoneNumber(phoneNumber: string): Promise<TGetPhoneNumberSchema>;
  updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string; outbound_agent_id?: string }
  ): Promise<TUpdatePhoneNumberResponseSchema>;

  createPhoneCall(data: {
    from_number: string;
    to_number: string;
    retell_llm_dynamic_variables?: any;
  }): Promise<TCreatePhoneSchema>;
}
