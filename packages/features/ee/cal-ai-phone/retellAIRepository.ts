import { PROMPT_TEMPLATES } from "@calcom/features/ee/cal-ai-phone/promptTemplates";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { handleErrorsJson } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type {
  TCreateRetellLLMSchema,
  TGetRetellLLMSchema,
  TCreatePhoneCallSchema,
  TemplateType,
  TGetPhoneNumberSchema,
  TCreatePhoneSchema,
} from "./zod-utils";
import {
  ZGetRetellLLMSchema,
  ZCreatePhoneSchema,
  ZCreateRetellLLMSchema,
  ZGetPhoneNumberSchema,
} from "./zod-utils";

const log = logger.getSubLogger({ prefix: ["retellAIRepository"] });

export const fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
  return fetch(`https://api.retellai.com${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.RETELL_AI_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  }).then(handleErrorsJson);
};

interface RetellAIRepositoryInterface {
  createRetellLLMAndWebsocketUrl(): Promise<TCreateRetellLLMSchema>;
  getRetellLLM(llmId: string): Promise<TGetRetellLLMSchema>;
  updatedRetellLLMAndWebsocketUrl(llmId: string): Promise<TGetRetellLLMSchema>;
  getPhoneNumberDetails(): Promise<TGetPhoneNumberSchema>;
  updateAgentWebsocketUrl(agentId: string, llmWebsocketUrl: string): Promise<void>;
  createRetellPhoneCall(numberToCall: string): Promise<TCreatePhoneSchema>;
}

type DynamicVariables = Pick<
  TCreatePhoneCallSchema,
  "guestName" | "guestEmail" | "guestCompany" | "schedulerName"
>;

type initProps = {
  templateType: TemplateType;
  yourPhoneNumber: string;
  eventTypeId: number;
  calApiKey: string;
  loggedInUserTimeZone: string;
  beginMessage?: string;
  dynamicVariables: DynamicVariables;
};

export class RetellAIRepository implements RetellAIRepositoryInterface {
  templateType: TemplateType;
  yourPhoneNumber: string;
  eventTypeId: number;
  calApiKey: string;
  loggedInUserTimeZone: string;
  beginMessage?: string;

  dynamicVariables: DynamicVariables;

  constructor({
    templateType,
    yourPhoneNumber,
    eventTypeId,
    calApiKey,
    loggedInUserTimeZone,
    dynamicVariables,
    beginMessage,
  }: initProps) {
    this.templateType = templateType;
    this.yourPhoneNumber = yourPhoneNumber;
    this.eventTypeId = eventTypeId;
    this.calApiKey = calApiKey;
    this.loggedInUserTimeZone = loggedInUserTimeZone;
    this.dynamicVariables = dynamicVariables;
    this.beginMessage = beginMessage;
  }

  async createRetellLLMAndWebsocketUrl(): Promise<TCreateRetellLLMSchema> {
    try {
      const generalPrompt = PROMPT_TEMPLATES[this.templateType].generalPrompt;

      const createdRetellLLM = await fetcher("/create-retell-llm", {
        method: "POST",
        body: JSON.stringify({
          general_prompt: generalPrompt,
          begin_message: this.beginMessage,
          inbound_dynamic_variables_webhook_url: `${WEBAPP_URL}/api/get-inbound-dynamic-variables`,
          general_tools: [
            {
              type: "end_call",
              name: "end_call",
              description: "Hang up the call, triggered only after appointment successfully scheduled.",
            },
            {
              type: "check_availability_cal",
              name: "check_availability",
              cal_api_key: this.calApiKey,
              event_type_id: this.eventTypeId,
              timezone: this.loggedInUserTimeZone,
            },
            {
              type: "book_appointment_cal",
              name: "book_appointment",
              cal_api_key: this.calApiKey,
              event_type_id: this.eventTypeId,
              timezone: this.loggedInUserTimeZone,
            },
          ],
        }),
      }).then(ZCreateRetellLLMSchema.parse);

      const llmWebSocketUrlToBeUpdated = createdRetellLLM.llm_websocket_url;
      const updated = await this.updateAgentWebsocketUrl(llmWebSocketUrlToBeUpdated);
      logger.debug("updated Retell Agent", updated);

      return Promise.resolve(createdRetellLLM);
    } catch (error) {
      log.error("Unable to Create Retell LLM", safeStringify(error));
      throw new Error("Something went wrong! Unable to Create Retell LLM");
    }
  }

  async getRetellLLM(llmId: string): Promise<TGetRetellLLMSchema> {
    try {
      const retellLLM = await fetcher(`/get-retell-llm/${llmId}`).then(ZGetRetellLLMSchema.parse);

      return Promise.resolve(retellLLM);
    } catch (err) {
      log.error("Unable to get Retell LLM", safeStringify(err));
      throw new Error("Something went wrong! Unable to get Retell LLM");
    }
  }

  async updatedRetellLLMAndWebsocketUrl(llmId: string): Promise<TGetRetellLLMSchema> {
    try {
      const generalPrompt = PROMPT_TEMPLATES[this.templateType].generalPrompt;

      const updatedRetellLLM = await fetcher(`/update-retell-llm/${llmId}`, {
        method: "PATCH",
        body: JSON.stringify({
          general_prompt: generalPrompt,
          begin_message: this.beginMessage,
          inbound_dynamic_variables_webhook_url: `${WEBAPP_URL}/api/get-inbound-dynamic-variables`,
        }),
      }).then(ZGetRetellLLMSchema.parse);

      const llmWebSocketUrlToBeUpdated = updatedRetellLLM.llm_websocket_url;
      const updated = await this.updateAgentWebsocketUrl(llmWebSocketUrlToBeUpdated);
      logger.debug("updated Retell Agent", updated);

      return Promise.resolve(updatedRetellLLM);
    } catch (err) {
      log.error("Unable to Update Retell LLM", safeStringify(err));
      throw new Error("Something went wrong! Unable to Update Retell LLM");
    }
  }

  async getPhoneNumberDetails(): Promise<TGetPhoneNumberSchema> {
    try {
      const getPhoneNumberDetails = await fetcher(`/get-phone-number/${this.yourPhoneNumber}`).then(
        ZGetPhoneNumberSchema.parse
      );

      return Promise.resolve(getPhoneNumberDetails);
    } catch (err) {
      log.error("Unable to Get Phone number", safeStringify(err));
      throw new Error("Something went wrong! Unable to Get Phone number");
    }
  }

  async updateAgentWebsocketUrl(llmWebsocketUrl: string): Promise<void> {
    try {
      const phoneNumberDetails = await this.getPhoneNumberDetails();
      const updated = await fetcher(`/update-agent/${phoneNumberDetails.agent_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          llm_websocket_url: llmWebsocketUrl,
        }),
      });
    } catch (err) {
      log.error("Unable to Update Agent", safeStringify(err));
      throw new Error("Something went wrong! Unable to Update Agent");
    }
  }

  async createRetellPhoneCall(numberToCall: string): Promise<TCreatePhoneSchema> {
    try {
      const createPhoneCallRes = await fetcher("/create-phone-call", {
        method: "POST",
        body: JSON.stringify({
          from_number: this.yourPhoneNumber,
          to_number: numberToCall,
          retell_llm_dynamic_variables: {
            name: this.dynamicVariables.guestName,
            company: this.dynamicVariables.guestCompany,
            email: this.dynamicVariables.guestEmail,
          },
        }),
      }).then(ZCreatePhoneSchema.parse);

      return Promise.resolve(createPhoneCallRes);
    } catch (err) {
      log.error("Unable to Get Phone number", safeStringify(err));
      throw new Error("Something went wrong! Unable to Get Phone number");
    }
  }
}
