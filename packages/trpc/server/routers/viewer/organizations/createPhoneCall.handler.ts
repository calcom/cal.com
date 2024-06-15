import type { z } from "zod";

import { PROMPT_TEMPLATES } from "@calcom/features/ee/cal-ai-phone/promptTemplates";
import { RetellAIFacade } from "@calcom/features/ee/cal-ai-phone/retellAIFacade";
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

  const retellAI = new RetellAIFacade({
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

  if (!aiPhoneCallConfig.llmId) {
    const createdRetellLLM = await retellAI.createRetellLLMAndUpdateWebsocketUrl();

    await ctx.prisma.aIPhoneCallConfiguration.update({
      where: {
        eventTypeId,
      },
      data: {
        llmId: createdRetellLLM.llm_id,
      },
    });
  } else {
    const retellLLM = await retellAI.getRetellLLM(aiPhoneCallConfig.llmId);

    if (retellLLM.general_prompt !== generalPrompt || retellLLM.begin_message !== beginMessage) {
      const updatedRetellLLM = await retellAI.updatedRetellLLMAndUpdateWebsocketUrl(aiPhoneCallConfig.llmId);
      logger.debug("updated Retell LLM", updatedRetellLLM);
    }
  }

  const createPhoneCallRes = await retellAI.createRetellPhoneCall(numberToCall);
  logger.debug("Create Call Response", createPhoneCallRes);

  return createPhoneCallRes;
};

export default createPhoneCallHandler;
