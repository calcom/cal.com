import { PROMPT_TEMPLATES, LegacyRetellAIService } from "@calcom/features/calAIPhone";
import { templateTypeEnum } from "@calcom/features/calAIPhone";
import type { TCreatePhoneCallSchema } from "@calcom/features/calAIPhone";
import { validatePhoneNumber } from "@calcom/features/calAIPhone/retellAIService";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

export const handleCreatePhoneCall = async ({
  user,
  input,
}: {
  user: { timeZone: string; id: number; profile?: { organization?: { id?: number } } };
  input: TCreatePhoneCallSchema;
}) => {
  if (!user?.profile?.organization) {
    throw new ErrorWithCode(ErrorCode.Unauthorized, "User is not part of an organization");
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createPhoneCall:${user.id}`,
  });

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

  const retellAI = new LegacyRetellAIService({
    templateType,
    generalPrompt: generalPrompt ?? "",
    beginMessage: beginMessage ?? null,
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
    // aiPhoneCallConfig.llmId would be set here in the else block
    const retellLLM = await retellAI.getRetellLLM(aiPhoneCallConfig.llmId as string);

    const shouldUpdateLLM =
      retellLLM.general_prompt !== generalPrompt || retellLLM.begin_message !== beginMessage;

    if (shouldUpdateLLM) {
      const updatedRetellLLM = await retellAI.updatedRetellLLMAndUpdateWebsocketUrl(
        aiPhoneCallConfig.llmId as string
      );
      logger.debug("updated Retell LLM", updatedRetellLLM);
    }
  }

  const createPhoneCallRes = await retellAI.createRetellPhoneCall(numberToCall);
  logger.debug("Create Call Response", createPhoneCallRes);

  return { callId: createPhoneCallRes.call_id, agentId: createPhoneCallRes.agent_id };
};
