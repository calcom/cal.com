import { createSelfServePhoneCall } from "@calcom/features/ee/cal-ai-phone/retellAIService";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

export const handleCreateSelfServePhoneCall = async ({
  userId,
  eventTypeId,
  numberToCall,
}: {
  userId: number;
  eventTypeId: number;
  numberToCall: string;
}) => {
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `create-self-serve-phone-call:${userId}`,
  });

  const config = await prisma.aISelfServeConfiguration.findFirst({
    where: {
      eventTypeId: eventTypeId,
      eventType: {
        userId: userId,
      },
    },
    include: {
      yourPhoneNumber: true,
    },
  });

  console.log("config", config);
  if (!config || !config.yourPhoneNumber) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "AI not configured for this event type or no phone number is assigned.",
    });
  }

  const fromNumber = config.yourPhoneNumber.phoneNumber;
  const call = await createSelfServePhoneCall(fromNumber, numberToCall);

  return call;
};
