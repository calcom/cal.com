import { z } from "zod";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { fetcher } from "@calcom/lib/retellAIFetcher";
import type { PrismaClient } from "@calcom/prisma";
import { getRetellLLMSchema } from "@calcom/prisma/zod-utils";
import type { AIPhoneSettingSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type CreatePhoneCallProps = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: z.infer<typeof AIPhoneSettingSchema>;
};

const createRetellLLMSchema = z
  .object({
    llm_id: z.string(),
    llm_websocket_url: z.string(),
  })
  .passthrough();

const createPhoneSchema = z
  .object({
    call_id: z.string(),
    agent_id: z.string(),
  })
  .passthrough();

const getPhoneNumberSchema = z
  .object({
    agent_id: z.string(),
  })
  .passthrough();

const createPhoneCallHandler = async ({ input, ctx }: CreatePhoneCallProps) => {
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createPhoneCall:${ctx.user.id}`,
  });

  const {
    yourPhoneNumber,
    numberToCall,
    guestName,
    guestEmail,
    guestCompany,
    eventTypeId,
    beginMessage,
    generalPrompt,
    calApiKey,
  } = input;

  const aiPhoneCallConfig = await ctx.prisma.aIPhoneCallConfiguration.upsert({
    where: {
      eventTypeId,
    },
    update: {
      beginMessage,
      generalPrompt,
      enabled: true,
      guestName,
      guestEmail,
      guestCompany,
      numberToCall,
      yourPhoneNumber,
    },
    create: {
      eventTypeId,
      beginMessage,
      generalPrompt,
      enabled: true,
      guestName,
      guestEmail,
      guestCompany,
      numberToCall,
      yourPhoneNumber,
    },
  });

  let llmWebSocketUrlToBeUpdated = null;

  if (!aiPhoneCallConfig.llmId) {
    const createdRetellLLM = await fetcher("/create-retell-llm", {
      method: "POST",
      body: JSON.stringify({
        general_prompt: generalPrompt,
        begin_message: beginMessage,
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
            cal_api_key: calApiKey,
            event_type_id: eventTypeId,
            timezone: ctx.user.timeZone,
          },
          {
            type: "book_appointment_cal",
            name: "book_appointment",
            cal_api_key: calApiKey,
            event_type_id: eventTypeId,
            timezone: ctx.user.timeZone,
          },
        ],
      }),
    }).then(createRetellLLMSchema.parse);

    await ctx.prisma.aIPhoneCallConfiguration.update({
      where: {
        eventTypeId,
      },
      data: {
        llmId: createdRetellLLM.llm_id,
      },
    });

    llmWebSocketUrlToBeUpdated = createdRetellLLM.llm_websocket_url;
  } else {
    const retellLLM = await fetcher(`/get-retell-llm/${aiPhoneCallConfig.llmId}`).then(
      getRetellLLMSchema.parse
    );

    if (retellLLM.general_prompt !== generalPrompt || retellLLM.begin_message !== beginMessage) {
      const updatedRetellLLM = await fetcher(`/update-retell-llm/${aiPhoneCallConfig.llmId}`, {
        method: "PATCH",
        body: JSON.stringify({
          general_prompt: generalPrompt,
          begin_message: beginMessage,
          inbound_dynamic_variables_webhook_url: `${WEBAPP_URL}/api/get-inbound-dynamic-variables`,
        }),
      }).then(getRetellLLMSchema.parse);

      logger.debug("updated Retell LLM", updatedRetellLLM);

      llmWebSocketUrlToBeUpdated = updatedRetellLLM.llm_websocket_url;
    }
  }

  if (llmWebSocketUrlToBeUpdated) {
    const getPhoneNumberDetails = await fetcher(`/get-phone-number/${yourPhoneNumber}`).then(
      getPhoneNumberSchema.parse
    );

    const updated = await fetcher(`/update-agent/${getPhoneNumberDetails.agent_id}`, {
      method: "PATCH",
      body: JSON.stringify({
        llm_websocket_url: llmWebSocketUrlToBeUpdated,
      }),
    });

    logger.debug("updated Retell Agent", updated);
  }

  // Create Phone Call
  const createPhoneCallRes = await fetcher("/create-phone-call", {
    method: "POST",
    body: JSON.stringify({
      from_number: yourPhoneNumber,
      to_number: numberToCall,
      retell_llm_dynamic_variables: { name: guestName, company: guestCompany, email: guestEmail },
    }),
  }).then(createPhoneSchema.parse);

  logger.debug("Create Call Response", createPhoneCallRes);

  return createPhoneCallRes;
};

export default createPhoneCallHandler;
