import { z } from "zod";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { handleErrorsJson } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";
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
  })
  .passthrough();

const getRetellLLMSchema = z
  .object({
    general_prompt: z.string(),
  })
  .passthrough();

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

const createPhoneCallHandler = async ({ input, ctx }: CreatePhoneCallProps) => {
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createPhoneCall:${ctx.user.id}`,
  });

  const { yourPhoneNumber, numberToCall, guestName, eventTypeId, beginMessage, generalPrompt } = input;

  const aiPhoneCallConfig = await ctx.prisma.aIPhoneCallConfiguration.upsert({
    where: {
      eventTypeId,
    },
    update: {
      beginMessage,
      generalPrompt,
      isCalAiPhoneCallEnabled: true,
    },
    create: {
      eventTypeId,
      beginMessage,
      generalPrompt,
      isCalAiPhoneCallEnabled: true,
    },
  });

  if (!aiPhoneCallConfig.llmId) {
    const createdRetellLLM = await fetcher("/create-retell-llm", {
      method: "POST",
      body: JSON.stringify({
        general_prompt: generalPrompt,
        begin_message: beginMessage,
        general_tools: [
          {
            type: "end_call",
            name: "end_call",
            description: "Hang up the call, triggered only after appointment successfully scheduled.",
          },
          {
            type: "check_availability_cal",
            name: "check_availability",
            // TODO: CAL API KEY Environment Var
            cal_api_key: "cal_live_cedb0d32c6e02a6ddeb8c1591b3d4255",
            event_type_id: eventTypeId,
            timezone: ctx.user.timeZone,
          },
          {
            type: "book_appointment_cal",
            name: "book_appointment",
            // TODO: CAL API KEY Environment Var
            cal_api_key: "cal_live_cedb0d32c6e02a6ddeb8c1591b3d4255",
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

    console.log("createdRetellLLM", createdRetellLLM);
  } else {
    const retellLLM = await fetcher(`/get-retell-llm/${aiPhoneCallConfig.llmId}`).then(
      getRetellLLMSchema.parse
    );

    if (retellLLM.general_prompt !== generalPrompt) {
      await fetcher(`/update-retell-llm/${aiPhoneCallConfig.llmId}`, {
        method: "PATCH",
        body: JSON.stringify({
          general_prompt: generalPrompt,
        }),
      });
    }
  }

  // Create Phone Call
  const createPhoneCallRes = await fetcher("/create-phone-call", {
    method: "POST",
    body: JSON.stringify({
      from_number: yourPhoneNumber,
      to_number: numberToCall,
      retell_llm_dynamic_variables: { name: guestName },
    }),
  });

  console.log("CreatePhoneCall", createPhoneCallRes);

  return createPhoneCallRes;
};

export default createPhoneCallHandler;
