import { PROMPT_TEMPLATES } from "@calcom/features/ee/cal-ai-phone/promptTemplates";
import { RetellAIService, validatePhoneNumber } from "@calcom/features/ee/cal-ai-phone/retellAIService";
import { templateTypeEnum } from "@calcom/features/ee/cal-ai-phone/zod-utils";
import type { TCreatePhoneCallSchema } from "@calcom/features/ee/cal-ai-phone/zod-utils";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

export const handleCreatePhoneCall = async ({
  user,
  input,
}: {
  user: NonNullable<TrpcSessionUser>;
  input: TCreatePhoneCallSchema;
}) => {
  if (!!!user.profile.organization) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createPhoneCall:${user.id}`,
  });

  // TODO: Remove this
  return { cal_id: "test" };

  await validatePhoneNumber(input.yourPhoneNumber);

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
    generalPrompt: userCustomPrompt,
  } = input;

  const generalPrompt =
    templateType === templateTypeEnum.enum.CUSTOM_TEMPLATE
      ? userCustomPrompt
      : PROMPT_TEMPLATES[templateType]?.generalPrompt;

  const retellAI = new RetellAIService({
    templateType,
    generalPrompt: generalPrompt ?? "",
    yourPhoneNumber,
    loggedInUserTimeZone: user.timeZone,
    eventTypeId,
    calApiKey,
    dynamicVariables: {
      guestName,
      guestEmail,
      guestCompany,
      schedulerName,
    },
  });

  const aiPhoneCallConfig = await prisma.aIPhoneCallConfiguration.upsert({
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
      templateType,
      generalPrompt,
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
      templateType,
      generalPrompt,
    },
  });

  // If no retell LLM is associated with the event type, create one
  if (!aiPhoneCallConfig.llmId) {
    const createdRetellLLM = await retellAI.createRetellLLMAndUpdateWebsocketUrl();

    await prisma.aIPhoneCallConfiguration.update({
      where: {
        eventTypeId,
      },
      data: {
        llmId: createdRetellLLM.llm_id,
      },
    });
  } else {
    const retellLLM = await retellAI.getRetellLLM(aiPhoneCallConfig.llmId);

    const doWeNeedToUpdateLLM =
      retellLLM.general_prompt !== generalPrompt || retellLLM.begin_message !== beginMessage;

    if (doWeNeedToUpdateLLM) {
      const updatedRetellLLM = await retellAI.updatedRetellLLMAndUpdateWebsocketUrl(aiPhoneCallConfig.llmId);
      logger.debug("updated Retell LLM", updatedRetellLLM);
    }
  }

  const createPhoneCallRes = await retellAI.createRetellPhoneCall(numberToCall);
  logger.debug("Create Call Response", createPhoneCallRes);

  return createPhoneCallRes;
};
