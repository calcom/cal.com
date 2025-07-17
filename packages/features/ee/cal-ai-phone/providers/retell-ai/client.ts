import logger from "@calcom/lib/logger";
import type { fetcher } from "@calcom/lib/retellAIFetcher";
import { safeStringify } from "@calcom/lib/safeStringify";

import type {
  TCreateRetellLLMSchema,
  TGetRetellLLMSchema,
  TCreatePhoneSchema,
  TCreatePhoneNumberResponseSchema,
  TCreateAgentResponseSchema,
  TUpdatePhoneNumberResponseSchema,
  TGetPhoneNumberSchema,
} from "../../zod-utils";
import {
  ZCreateRetellLLMSchema,
  ZGetRetellLLMSchema,
  ZCreatePhoneSchema,
  ZCreatePhoneNumberResponseSchema,
  ZCreateAgentResponseSchema,
  ZUpdatePhoneNumberResponseSchema,
  ZGetPhoneNumberSchema,
} from "../../zod-utils";
import { RetellAIError } from "./errors";
import type { CreateLLMRequest, CreateAgentRequest, UpdateLLMRequest, RetellAIRepository } from "./types";

export class RetellAIApiClient implements RetellAIRepository {
  private logger: ReturnType<typeof logger.getSubLogger>;

  constructor(private httpClient: typeof fetcher, customLogger?: ReturnType<typeof logger.getSubLogger>) {
    this.logger = customLogger || logger.getSubLogger({ prefix: ["retellAIApiClient:"] });
  }

  async createLLM(data: CreateLLMRequest): Promise<TCreateRetellLLMSchema> {
    this.logger.info("Creating LLM", {
      eventTypeId: data.general_tools.find((t) => t.event_type_id)?.event_type_id,
    });
    try {
      const response = await this.httpClient("/create-retell-llm", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const result = ZCreateRetellLLMSchema.parse(response);
      this.logger.info("LLM created successfully", { llmId: result.llm_id });
      return result;
    } catch (error) {
      this.logger.error("Failed to create LLM", { error: safeStringify(error) });
      throw new RetellAIError("Failed to create LLM", "createLLM", error);
    }
  }

  async getLLM(llmId: string): Promise<TGetRetellLLMSchema> {
    this.logger.info("Getting LLM", { llmId });
    try {
      const response = await this.httpClient(`/get-retell-llm/${llmId}`);
      const result = ZGetRetellLLMSchema.parse(response);
      this.logger.info("LLM retrieved successfully", { llmId });
      return result;
    } catch (error) {
      this.logger.error("Failed to get LLM", { error: safeStringify(error), llmId });
      throw new RetellAIError(`Failed to get LLM ${llmId}`, "getLLM", error);
    }
  }

  async updateLLM(llmId: string, data: UpdateLLMRequest): Promise<TGetRetellLLMSchema> {
    this.logger.info("Updating LLM", {
      llmId,
      hasPrompt: !!data.general_prompt,
      hasBeginMessage: !!data.begin_message,
    });
    try {
      const response = await this.httpClient(`/update-retell-llm/${llmId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      const result = ZGetRetellLLMSchema.parse(response);
      this.logger.info("LLM updated successfully", { llmId });
      return result;
    } catch (error) {
      this.logger.error("Failed to update LLM", { error: safeStringify(error), llmId });
      throw new RetellAIError(`Failed to update LLM ${llmId}`, "updateLLM", error);
    }
  }

  async deleteLLM(llmId: string): Promise<void> {
    this.logger.info("Deleting LLM", { llmId });
    try {
      await this.httpClient(`/delete-retell-llm/${llmId}`, {
        method: "DELETE",
      });
      this.logger.info("LLM deleted successfully", { llmId });
    } catch (error) {
      this.logger.error("Failed to delete LLM", { error: safeStringify(error), llmId });
      throw new RetellAIError(`Failed to delete LLM ${llmId}`, "deleteLLM", error);
    }
  }

  async createAgent(data: CreateAgentRequest): Promise<TCreateAgentResponseSchema> {
    this.logger.info("Creating agent", { agentName: data.agent_name, llmId: data.response_engine.llm_id });
    try {
      const response = await this.httpClient("/create-agent", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const result = ZCreateAgentResponseSchema.parse(response);
      this.logger.info("Agent created successfully", {
        agentId: result.agent_id,
        agentName: data.agent_name,
      });
      return result;
    } catch (error) {
      this.logger.error("Failed to create agent", {
        error: safeStringify(error),
        agentName: data.agent_name,
      });
      throw new RetellAIError("Failed to create agent", "createAgent", error);
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.logger.info("Deleting agent", { agentId });
    try {
      await this.httpClient(`/delete-agent/${agentId}`, {
        method: "DELETE",
      });
      this.logger.info("Agent deleted successfully", { agentId });
    } catch (error) {
      this.logger.error("Failed to delete agent", { error: safeStringify(error), agentId });
      throw new RetellAIError(`Failed to delete agent ${agentId}`, "deleteAgent", error);
    }
  }

  async createPhoneNumber(data: {
    area_code?: number;
    nickname?: string;
  }): Promise<TCreatePhoneNumberResponseSchema> {
    try {
      const response = await this.httpClient("/create-phone-number", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return ZCreatePhoneNumberResponseSchema.parse(response);
    } catch (error) {
      throw new RetellAIError("Failed to create phone number", "createPhoneNumber", error);
    }
  }

  async deletePhoneNumber(phoneNumber: string): Promise<void> {
    try {
      await this.httpClient(`/delete-phone-number/${phoneNumber}`, {
        method: "DELETE",
      });
    } catch (error) {
      throw new RetellAIError(`Failed to delete phone number ${phoneNumber}`, "deletePhoneNumber", error);
    }
  }

  async getPhoneNumber(phoneNumber: string): Promise<TGetPhoneNumberSchema> {
    try {
      const response = await this.httpClient(`/get-phone-number/${phoneNumber}`);
      return ZGetPhoneNumberSchema.parse(response);
    } catch (error) {
      throw new RetellAIError(`Failed to get phone number ${phoneNumber}`, "getPhoneNumber", error);
    }
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string | null; outbound_agent_id?: string | null }
  ): Promise<TUpdatePhoneNumberResponseSchema> {
    try {
      const response = await this.httpClient(`/update-phone-number/${phoneNumber}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return ZUpdatePhoneNumberResponseSchema.parse(response);
    } catch (error) {
      throw new RetellAIError(`Failed to update phone number ${phoneNumber}`, "updatePhoneNumber", error);
    }
  }

  async createPhoneCall(data: {
    from_number: string;
    to_number: string;
    retell_llm_dynamic_variables?: any;
  }): Promise<TCreatePhoneSchema> {
    try {
      const response = await this.httpClient("/v2/create-phone-call", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return ZCreatePhoneSchema.parse(response);
    } catch (error) {
      throw new RetellAIError("Failed to create phone call", "createPhoneCall", error);
    }
  }

  async importPhoneNumber(data: {
    phoneNumber: string;
    terminationUri: string;
    sipTrunkAuthUsername?: string;
    sipTrunkAuthPassword?: string;
    nickname?: string;
  }): Promise<TCreatePhoneNumberResponseSchema> {
    try {
      console.log("client.data", data);
      const response = await this.httpClient("/import-phone-number", {
        method: "POST",
        body: JSON.stringify({
          phone_number: data.phoneNumber,
          termination_uri: data.terminationUri,
          sip_trunk_auth_username: data.sipTrunkAuthUsername,
          sip_trunk_auth_password: data.sipTrunkAuthPassword,
          nickname: data.nickname,
        }),
      });
      console.log("client.response", response);
      const result = ZCreatePhoneNumberResponseSchema.parse(response);
      return {
        phoneNumber: result.phone_number,
        inboundAgentId: result?.inbound_agent_id,
        outboundAgentId: result?.outbound_agent_id,
        nickname: result?.nickname,
      };
    } catch (error) {
      throw new RetellAIError("Failed to import phone number", "importPhoneNumber", error);
    }
  }
}
