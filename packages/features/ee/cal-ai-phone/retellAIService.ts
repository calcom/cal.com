import logger from "@calcom/lib/logger";
import { fetcher } from "@calcom/lib/retellAIFetcher";
import { safeStringify } from "@calcom/lib/safeStringify";

import { DEFAULT_BEGIN_MESSAGE, DEFAULT_PROMPT_VALUE } from "./promptTemplates";
import type {
  TCreateRetellLLMSchema,
  TGetRetellLLMSchema,
  TCreatePhoneCallSchema,
  TemplateType,
  TGetPhoneNumberSchema,
  TCreatePhoneSchema,
  TCreatePhoneNumberResponseSchema,
  TCreateAgentResponseSchema,
  TUpdatePhoneNumberResponseSchema,
} from "./zod-utils";
import {
  ZGetRetellLLMSchema,
  ZCreatePhoneSchema,
  ZCreateRetellLLMSchema,
  ZGetPhoneNumberSchema,
  ZCreatePhoneNumberResponseSchema,
  ZCreateAgentResponseSchema,
  ZUpdatePhoneNumberResponseSchema,
} from "./zod-utils";

const log = logger.getSubLogger({ prefix: ["retellAIService: "] });

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
  beginMessage?: string | null;
  dynamicVariables: DynamicVariables;
  generalPrompt: string;
};

const updateAgentWebsocketUrl = async (
  phoneNumber: string,
  llmWebsocketUrl: string,
  llmId: string
): Promise<void> => {
  try {
    const phoneNumberDetails = await fetcher(`/get-phone-number/${phoneNumber}`).then(
      ZGetPhoneNumberSchema.parse
    );

    await fetcher(`/update-agent/${phoneNumberDetails.outbound_agent_id}`, {
      method: "PATCH",
      body: JSON.stringify({
        response_engined: {
          type: "retell-llm",
          llm_websocket_url: llmWebsocketUrl,
          llm_id: llmId,
        },
      }),
    });
  } catch (error) {
    log.error("Unable to Update Agent", safeStringify(error));
    throw new Error("Something went wrong! Unable to Update Agent");
  }
};

// Command Design Pattern
interface Command<T> {
  execute(): Promise<T>;
}

class CreateRetellLLMCommand implements Command<TCreateRetellLLMSchema> {
  constructor(private props: initProps) {}

  async execute(): Promise<TCreateRetellLLMSchema> {
    try {
      const createdRetellLLM = await fetcher("/create-retell-llm", {
        method: "POST",
        body: JSON.stringify({
          general_prompt: this.props.generalPrompt,
          begin_message: this.props.beginMessage,
          general_tools: [
            {
              type: "end_call",
              name: "end_call",
              description: "Hang up the call, triggered only after appointment successfully scheduled.",
            },
            {
              type: "check_availability_cal",
              name: "check_availability",
              cal_api_key: this.props.calApiKey,
              event_type_id: this.props.eventTypeId,
              timezone: this.props.loggedInUserTimeZone,
            },
            {
              type: "book_appointment_cal",
              name: "book_appointment",
              cal_api_key: this.props.calApiKey,
              event_type_id: this.props.eventTypeId,
              timezone: this.props.loggedInUserTimeZone,
            },
          ],
        }),
      }).then(ZCreateRetellLLMSchema.parse);

      return createdRetellLLM;
    } catch (error) {
      log.error("Unable to Create Retell LLM", safeStringify(error));
      throw new Error("Something went wrong! Unable to Create Retell LLM");
    }
  }
}

class GetRetellLLMCommand implements Command<TGetRetellLLMSchema> {
  constructor(private llmId: string) {}

  async execute(): Promise<TGetRetellLLMSchema> {
    try {
      const retellLLM = await fetcher(`/get-retell-llm/${this.llmId}`).then(ZGetRetellLLMSchema.parse);
      return retellLLM;
    } catch (err) {
      log.error("Unable to get Retell LLM", safeStringify(err));
      throw new Error("Something went wrong! Unable to get Retell LLM");
    }
  }
}

class GetPublicRetellLLMCommand implements Command<TGetRetellLLMSchema> {
  constructor(private llmId: string) {}

  async execute(): Promise<TGetRetellLLMSchema> {
    try {
      const retellLLM = await fetcher(`/get-retell-llm/${this.llmId}`).then(ZGetRetellLLMSchema.parse);
      const filteredRetellLLM = {
        ...retellLLM,
        general_tools: retellLLM.general_tools.map((tool) => ({
          ...tool,
          cal_api_key: undefined,
        })),
      };
      return filteredRetellLLM;
    } catch (err) {
      log.error("Unable to get Retell LLM", safeStringify(err));
      throw new Error("Something went wrong! Unable to get Retell LLM");
    }
  }
}

class UpdateRetellLLMCommand implements Command<TGetRetellLLMSchema> {
  constructor(private llmId: string, private updateData: { generalPrompt?: string; beginMessage?: string }) {}

  async execute(): Promise<TGetRetellLLMSchema> {
    try {
      const updatedRetellLLM = await fetcher(`/update-retell-llm/${this.llmId}`, {
        method: "PATCH",
        body: JSON.stringify({
          general_prompt: this.updateData.generalPrompt,
          begin_message: this.updateData.beginMessage,
        }),
      }).then(ZGetRetellLLMSchema.parse);

      return updatedRetellLLM;
    } catch (err) {
      log.error("Unable to Update Retell LLM", safeStringify(err));
      throw new Error("Something went wrong! Unable to Update Retell LLM");
    }
  }
}

class GetPhoneNumberDetailsCommand implements Command<TGetPhoneNumberSchema> {
  constructor(private phoneNumber: string) {}

  async execute(): Promise<TGetPhoneNumberSchema> {
    try {
      const phoneNumberDetails = await fetcher(`/get-phone-number/${this.phoneNumber}`).then(
        ZGetPhoneNumberSchema.parse
      );
      return phoneNumberDetails;
    } catch (err) {
      log.error("Unable to Get Phone number", safeStringify(err));
      throw new Error(
        "Something went wrong! Unable to Get Phone number. Please only use the phone number assigned to you."
      );
    }
  }
}

export const validatePhoneNumber = (phoneNumber: string) => {
  const command = new GetPhoneNumberDetailsCommand(phoneNumber);
  return command.execute();
};

class CreateRetellPhoneCallCommand implements Command<TCreatePhoneSchema> {
  constructor(private props: initProps, private numberToCall: string) {}

  async execute(): Promise<TCreatePhoneSchema> {
    try {
      const createPhoneCallRes = await fetcher("/v2/create-phone-call", {
        method: "POST",
        body: JSON.stringify({
          from_number: this.props.yourPhoneNumber,
          to_number: this.numberToCall,
          retell_llm_dynamic_variables: {
            name: this.props.dynamicVariables.guestName,
            company: this.props.dynamicVariables.guestCompany,
            email: this.props.dynamicVariables.guestEmail,
          },
        }),
      }).then(ZCreatePhoneSchema.parse);

      return createPhoneCallRes;
    } catch (err) {
      log.error("Unable to create phone call", safeStringify(err));
      throw new Error("Something went wrong! Unable to create phone call");
    }
  }
}

class CreatePhoneNumberCommand implements Command<TCreatePhoneNumberResponseSchema> {
  constructor(private areaCode?: number, private nickName?: string) {}

  async execute(): Promise<TCreatePhoneNumberResponseSchema> {
    try {
      const phoneNumber = await fetcher("/create-phone-number", {
        method: "POST",
        body: JSON.stringify({
          area_code: this.areaCode,
          nickname: this.nickName ?? `cal-ai-phone-${Date.now()}`, // Add a unique nickname
        }),
      }).then(ZCreatePhoneNumberResponseSchema.parse);

      return phoneNumber;
    } catch (error) {
      log.error("Unable to Create Phone Number", safeStringify(error));
      throw new Error("Something went wrong! Unable to Create Phone Number");
    }
  }
}

export const createPhoneNumber = async (
  areaCode?: number,
  nickName?: string
): Promise<TCreatePhoneNumberResponseSchema> => {
  const command = new CreatePhoneNumberCommand(areaCode, nickName);
  return command.execute();
};

class DeletePhoneNumberCommand implements Command<void> {
  constructor(private phoneNumber: string) {}

  async execute(): Promise<void> {
    try {
      await fetcher(`/delete-phone-number/${this.phoneNumber}`, {
        method: "DELETE",
      });
    } catch (error) {
      log.error("Unable to Delete Phone number", safeStringify(error));
      throw new Error("Something went wrong! Unable to Delete Phone number");
    }
  }
}

export const deletePhoneNumber = async (phoneNumber: string): Promise<void> => {
  const command = new DeletePhoneNumberCommand(phoneNumber);
  return command.execute();
};

class DeleteLLMCommand implements Command<void> {
  constructor(private llmId: string) {}

  async execute(): Promise<void> {
    try {
      await fetcher(`/delete-retell-llm/${this.llmId}`, {
        method: "DELETE",
      });
    } catch (error) {
      log.error("Unable to Delete LLM", safeStringify(error));
      throw new Error("Something went wrong! Unable to Delete LLM");
    }
  }
}

export const deleteLLM = async (llmId: string): Promise<void> => {
  const command = new DeleteLLMCommand(llmId);
  return command.execute();
};

class DeleteAgentCommand implements Command<void> {
  constructor(private agentId: string) {}

  async execute(): Promise<void> {
    try {
      await fetcher(`/delete-agent/${this.agentId}`, {
        method: "DELETE",
      });
    } catch (error) {
      log.error("Unable to Delete Agent", safeStringify(error));
      throw new Error("Something went wrong! Unable to Delete Agent");
    }
  }
}

export const deleteAgent = async (agentId: string): Promise<void> => {
  const command = new DeleteAgentCommand(agentId);
  return command.execute();
};

export class RetellAIService {
  private props: initProps;

  constructor(props: initProps) {
    this.props = props;
  }

  async createRetellLLMAndUpdateWebsocketUrl(): Promise<TCreateRetellLLMSchema> {
    const command = new CreateRetellLLMCommand(this.props);
    return command.execute();
  }

  async getRetellLLM(llmId: string): Promise<TGetRetellLLMSchema> {
    const command = new GetRetellLLMCommand(llmId);
    return command.execute();
  }

  async updatedRetellLLMAndUpdateWebsocketUrl(llmId: string): Promise<TGetRetellLLMSchema> {
    const command = new UpdateRetellLLMCommand(llmId, {
      generalPrompt: this.props.generalPrompt,
      beginMessage: this.props.beginMessage ?? undefined,
    });
    return command.execute();
  }

  async getPhoneNumberDetails(): Promise<TGetPhoneNumberSchema> {
    const command = new GetPhoneNumberDetailsCommand(this.props.yourPhoneNumber);
    return command.execute();
  }

  async createRetellPhoneCall(numberToCall: string): Promise<TCreatePhoneSchema> {
    const command = new CreateRetellPhoneCallCommand(this.props, numberToCall);
    return command.execute();
  }
}

class InitialSetupLLMCommand implements Command<TCreateRetellLLMSchema> {
  constructor(private calApiKey: string, private timeZone: string, private eventTypeId: number) {}

  async execute(): Promise<TCreateRetellLLMSchema> {
    try {
      const createdRetellLLM = await fetcher("/create-retell-llm", {
        method: "POST",
        body: JSON.stringify({
          general_prompt: DEFAULT_PROMPT_VALUE,
          begin_message: DEFAULT_BEGIN_MESSAGE,
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
              timezone: this.timeZone,
            },
            {
              type: "book_appointment_cal",
              name: "book_appointment",
              cal_api_key: this.calApiKey,
              event_type_id: this.eventTypeId,
              // event_type_id: 297707,
              timezone: this.timeZone,
            },
          ],
        }),
      }).then(ZCreateRetellLLMSchema.parse);

      return createdRetellLLM;
    } catch (error) {
      log.error("Unable to Create Retell LLM", safeStringify(error));
      throw new Error("Something went wrong! Unable to Create Retell LLM");
    }
  }
}

export const initialSetupLLM = (calApiKey: string, timeZone: string, eventTypeId: number) => {
  const command = new InitialSetupLLMCommand(calApiKey, timeZone, eventTypeId);
  return command.execute();
};

export async function getRetellLLM(llmId: string): Promise<TGetRetellLLMSchema> {
  const command = new GetRetellLLMCommand(llmId);
  return command.execute();
}

export async function getPublicRetellLLM(llmId: string): Promise<TGetRetellLLMSchema> {
  const command = new GetPublicRetellLLMCommand(llmId);
  return command.execute();
}

export async function updateRetellLLM(
  llmId: string,
  updateData: { generalPrompt?: string; beginMessage?: string }
): Promise<TGetRetellLLMSchema> {
  const command = new UpdateRetellLLMCommand(llmId, {
    generalPrompt: updateData.generalPrompt ?? undefined,
    beginMessage: updateData.beginMessage ?? undefined,
  });
  return command.execute();
}

class CreateAgentCommand implements Command<TCreateAgentResponseSchema> {
  constructor(private llmId: string, private agentName: string) {}

  async execute(): Promise<TCreateAgentResponseSchema> {
    try {
      const agent = await fetcher("/create-agent", {
        method: "POST",
        body: JSON.stringify({
          response_engine: { llm_id: this.llmId, type: "retell-llm" },
          agent_name: this.agentName,
          voice_id: "11labs-Adrian", // A default voice
        }),
      }).then(ZCreateAgentResponseSchema.parse);
      return agent;
    } catch (error) {
      log.error("Unable to Create Agent", safeStringify(error));
      throw new Error("Something went wrong! Unable to Create Agent");
    }
  }
}

class UpdatePhoneNumberCommand implements Command<TUpdatePhoneNumberResponseSchema> {
  constructor(private phoneNumber: string, private agentId: string) {}

  async execute(): Promise<TUpdatePhoneNumberResponseSchema> {
    try {
      const phoneNumber = await fetcher(`/update-phone-number/${this.phoneNumber}`, {
        method: "PATCH",
        body: JSON.stringify({
          inbound_agent_id: this.agentId,
          outbound_agent_id: this.agentId,
        }),
      }).then(ZUpdatePhoneNumberResponseSchema.parse);

      return phoneNumber;
    } catch (error) {
      log.error("Unable to update phone number", safeStringify(error));
      throw new Error("Something went wrong! Unable to update phone number.");
    }
  }
}

export const createAgent = async (llmId: string, agentName: string) => {
  const command = new CreateAgentCommand(llmId, agentName);
  return command.execute();
};

export const updatePhoneNumber = async (phoneNumber: string, agentId: string) => {
  const command = new UpdatePhoneNumberCommand(phoneNumber, agentId);
  return command.execute();
};

class CreateSimplePhoneCallCommand implements Command<TCreatePhoneSchema> {
  constructor(private fromNumber: string, private toNumber: string) {}

  async execute(): Promise<TCreatePhoneSchema> {
    try {
      const createPhoneCallRes = await fetcher("/v2/create-phone-call", {
        method: "POST",
        body: JSON.stringify({
          from_number: this.fromNumber,
          to_number: this.toNumber,
        }),
      }).then(ZCreatePhoneSchema.parse);

      return createPhoneCallRes;
    } catch (err) {
      log.error("Unable to create phone call", safeStringify(err));
      throw new Error("Something went wrong! Unable to create phone call");
    }
  }
}

export const createSelfServePhoneCall = (fromNumber: string, toNumber: string) => {
  const command = new CreateSimplePhoneCallCommand(fromNumber, toNumber);
  return command.execute();
};
