import type { z } from "zod";

import { PROMPT_TEMPLATES } from "@calcom/features/ee/cal-ai-phone/promptTemplates";
import { RetellAIRepository } from "@calcom/features/ee/cal-ai-phone/retellAIRepository";
import type { createPhoneCallSchema } from "@calcom/features/ee/cal-ai-phone/zod-utils";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type CreatePhoneCallProps = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: z.infer<typeof createPhoneCallSchema>;
};

const createPhoneCallHandler = async ({ input, ctx }: CreatePhoneCallProps) => {
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createPhoneCall:${ctx.user.id}`,
  });

  // Add check event type belongs to user and Your Phone Number belongs to user

  const {
    yourPhoneNumber,
    numberToCall,
    guestName,
    guestEmail,
    guestCompany,
    eventTypeId,
    beginMessage,
    calApiKey,
    templateType,
    schedulerName,
  } = input;

  const generalPrompt = PROMPT_TEMPLATES[templateType].generalPrompt;

  const retellAI = new RetellAIRepository({
    templateType,
    yourPhoneNumber,
    loggedInUserTimeZone: ctx.user.timeZone,
    eventTypeId,
    calApiKey,
    dynamicVariables: {
      guestName,
      guestEmail,
      guestCompany,
      schedulerName,
    },
  });

  const aiPhoneCallConfig = await ctx.prisma.aIPhoneCallConfiguration.upsert({
    where: {
      eventTypeId,
    },
    update: {
      beginMessage,
      enabled: true,
      guestName,
      guestEmail,
      guestCompany,
      numberToCall,
      yourPhoneNumber,
      schedulerName,
    },
    create: {
      eventTypeId,
      beginMessage,
      enabled: true,
      guestName,
      guestEmail,
      guestCompany,
      numberToCall,
      yourPhoneNumber,
      schedulerName,
    },
  });

  let llmWebSocketUrlToBeUpdated = null;

  if (!aiPhoneCallConfig.llmId) {
    const createdRetellLLM = await retellAI.createRetellLLM();

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
    const retellLLM = await retellAI.getRetellLLM(aiPhoneCallConfig.llmId);

    if (retellLLM.general_prompt !== generalPrompt || retellLLM.begin_message !== beginMessage) {
      const updatedRetellLLM = await retellAI.updatedRetellLLM(aiPhoneCallConfig.llmId);
      logger.debug("updated Retell LLM", updatedRetellLLM);
      llmWebSocketUrlToBeUpdated = updatedRetellLLM.llm_websocket_url;
    }
  }

  if (llmWebSocketUrlToBeUpdated) {
    const getPhoneNumberDetails = await retellAI.getPhoneNumberDetails();
    const updated = await retellAI.updateAgent(getPhoneNumberDetails.agent_id, llmWebSocketUrlToBeUpdated);

    logger.debug("updated Retell Agent", updated);
  }

  const createPhoneCallRes = await retellAI.createRetellPhoneCall(numberToCall);

  logger.debug("Create Call Response", createPhoneCallRes);

  return createPhoneCallRes;
};

export default createPhoneCallHandler;
