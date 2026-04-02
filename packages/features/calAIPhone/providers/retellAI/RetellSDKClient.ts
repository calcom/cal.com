import process from "node:process";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { Retell } from "retell-sdk";
import type {
  CreateAgentRequest,
  CreateLLMRequest,
  CreatePhoneCallParams,
  CreatePhoneNumberParams,
  CreateWebCallParams,
  ImportPhoneNumberParams,
  RetellAgent,
  RetellAIRepository,
  RetellCallListParams,
  RetellCallListResponse,
  RetellVoice,
  UpdateAgentRequest,
  UpdateLLMRequest,
} from "./types";

const RETELL_API_KEY = process.env.RETELL_AI_KEY;

export class RetellSDKClient implements RetellAIRepository {
  private client: Retell;
  private logger: ReturnType<typeof logger.getSubLogger>;

  constructor(customLogger?: ReturnType<typeof logger.getSubLogger>) {
    this.logger = customLogger || logger.getSubLogger({ prefix: ["retellSDKClient:"] });

    if (!RETELL_API_KEY) {
      throw new HttpError({
        statusCode: 500,
        message: "RETELL_API_KEY is not configured",
      });
    }

    this.client = new Retell({
      apiKey: RETELL_API_KEY,
    });
  }

  async createLLM(data: CreateLLMRequest) {
    this.logger.info("Creating LLM via SDK", {
      eventTypeId: data.general_tools?.find((t) => "event_type_id" in t)?.event_type_id,
    });

    try {
      const response = await this.client.llm.create(data);

      this.logger.info("LLM created successfully", { llmId: response.llm_id });
      return response;
    } catch (error) {
      this.logger.error("Failed to create LLM", { error });
      throw error;
    }
  }

  async getLLM(llmId: string) {
    this.logger.info("Getting LLM via SDK", { llmId });

    try {
      const response = await this.client.llm.retrieve(llmId);
      this.logger.info("LLM retrieved successfully", { llmId });
      return response;
    } catch (error) {
      this.logger.error("Failed to get LLM", { error, llmId });
      throw error;
    }
  }

  async updateLLM(llmId: string, data: UpdateLLMRequest) {
    try {
      this.logger.info("Updating LLM via SDK", { llmId });

      const response = await this.client.llm.update(llmId, data);

      this.logger.info("LLM updated successfully", { llmId });
      return response;
    } catch (error) {
      this.logger.error("Failed to update LLM", { error, llmId });
      throw error;
    }
  }

  async deleteLLM(llmId: string) {
    this.logger.info("Deleting LLM via SDK", { llmId });

    try {
      await this.client.llm.delete(llmId);
      this.logger.info("LLM deleted successfully", { llmId });
    } catch (error) {
      this.logger.error("Failed to delete LLM", { error, llmId });
      throw error;
    }
  }

  async createOutboundAgent(data: CreateAgentRequest): Promise<RetellAgent> {
    this.logger.info("Creating agent via SDK", {
      agentName: data.agent_name,
    });

    try {
      const response = await this.client.agent.create(data);

      this.logger.info("Agent created successfully", {
        agentId: response.agent_id,
        agentName: data.agent_name,
      });

      return response;
    } catch (error) {
      this.logger.error("Failed to create agent", {
        error,
        agentName: data.agent_name,
      });
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<RetellAgent> {
    this.logger.info("Getting agent via SDK", { agentId });

    try {
      const response = await this.client.agent.retrieve(agentId);
      this.logger.info("Agent retrieved successfully", { agentId });

      return response;
    } catch (error) {
      this.logger.error("Failed to get agent", { error, agentId });
      throw error;
    }
  }

  async updateAgent(agentId: string, data: UpdateAgentRequest): Promise<RetellAgent> {
    this.logger.info("Updating agent via SDK", { agentId });

    try {
      const response = await this.client.agent.update(agentId, data);
      this.logger.info("Agent updated successfully", { agentId });

      return response;
    } catch (error) {
      this.logger.error("Failed to update agent", { error, agentId });
      throw error;
    }
  }

  async deleteAgent(agentId: string) {
    this.logger.info("Deleting agent via SDK", { agentId });

    try {
      await this.client.agent.delete(agentId);
      this.logger.info("Agent deleted successfully", { agentId });
    } catch (error) {
      this.logger.error("Failed to delete agent", { error, agentId });
      throw error;
    }
  }

  async createPhoneNumber(data: CreatePhoneNumberParams) {
    try {
      const response = await this.client.phoneNumber.create({
        area_code: data.area_code,
        inbound_agent_id: data.inbound_agent_id,
        outbound_agent_id: data.outbound_agent_id,
        nickname: data.nickname,
      });
      return response;
    } catch (error) {
      this.logger.error("Failed to create phone number", { error });
      throw error;
    }
  }

  async importPhoneNumber(data: ImportPhoneNumberParams) {
    try {
      const response = await this.client.phoneNumber.import({
        phone_number: data.phone_number,
        termination_uri: data.termination_uri,
        sip_trunk_auth_username: data.sip_trunk_auth_username,
        sip_trunk_auth_password: data.sip_trunk_auth_password,
        nickname: data.nickname,
      });
      return response;
    } catch (error) {
      this.logger.error("Failed to import phone number", { error });
      throw error;
    }
  }

  async deletePhoneNumber(phoneNumber: string) {
    try {
      this.logger.info("Deleting phone number via SDK", { phoneNumber });
      await this.client.phoneNumber.delete(phoneNumber);
    } catch (error) {
      this.logger.error("Failed to delete phone number", { error, phoneNumber });
      throw error;
    }
  }

  async getPhoneNumber(phoneNumber: string) {
    try {
      const response = await this.client.phoneNumber.retrieve(phoneNumber);
      return response;
    } catch (error) {
      this.logger.error("Failed to get phone number", { error, phoneNumber });
      throw error;
    }
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string | null; outbound_agent_id?: string | null }
  ) {
    try {
      const response = await this.client.phoneNumber.update(phoneNumber, {
        inbound_agent_id: data.inbound_agent_id,
        outbound_agent_id: data.outbound_agent_id,
      });
      return response;
    } catch (error) {
      this.logger.error("Failed to update phone number", { error, phoneNumber });
      throw error;
    }
  }

  async createPhoneCall(data: CreatePhoneCallParams) {
    try {
      const response = await this.client.call.createPhoneCall({
        from_number: data.fromNumber,
        to_number: data.toNumber,
        retell_llm_dynamic_variables: data.dynamicVariables,
      });
      return response;
    } catch (error) {
      this.logger.error("Failed to create phone call", { error });
      throw error;
    }
  }

  async listCalls(params: RetellCallListParams): Promise<RetellCallListResponse> {
    try {
      this.logger.info("Listing calls via SDK", {
        limit: params.limit,
        hasFilters: !!params.filter_criteria,
      });

      const response = await this.client.call.list(params);

      this.logger.info("Calls listed successfully", {
        count: response.length,
      });

      return response;
    } catch (error) {
      this.logger.error("Failed to list calls", { error });
      throw error;
    }
  }

  async createWebCall(data: CreateWebCallParams) {
    try {
      const response = await this.client.call.createWebCall({
        agent_id: data.agentId,
        retell_llm_dynamic_variables: data.dynamicVariables,
      });
      return response;
    } catch (error) {
      this.logger.error("Failed to create web call", { error });
      throw error;
    }
  }

  async listVoices(): Promise<RetellVoice[]> {
    try {
      const response = await this.client.voice.list();

      return response;
    } catch (error) {
      this.logger.error("Failed to list voices", { error });
      throw error;
    }
  }
}
