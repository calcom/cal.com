import logger from "@calcom/lib/logger";
import { fetcher } from "@calcom/lib/retellAIFetcher";
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

class UpdateRetellLLMCommand implements Command<TGetRetellLLMSchema> {
  constructor(
    private props: initProps,
    private llmId: string
  ) {}

  async execute(): Promise<TGetRetellLLMSchema> {
    try {
      const updatedRetellLLM = await fetcher(`/update-retell-llm/${this.llmId}`, {
        method: "PATCH",
        body: JSON.stringify({
          general_prompt: this.props.generalPrompt,
          begin_message: this.props.beginMessage,
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
  constructor(
    private props: initProps,
    private numberToCall: string
  ) {}

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
    const command = new UpdateRetellLLMCommand(this.props, llmId);
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
