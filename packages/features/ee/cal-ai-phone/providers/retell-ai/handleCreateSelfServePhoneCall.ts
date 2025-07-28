import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

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

  // const { AISelfServeConfigurationRepository } = await import(
  //   "@calcom/lib/server/repository/aiSelfServeConfiguration"
  // );
  // const config = await AISelfServeConfigurationRepository.findByEventTypeIdAndUserId({
  //   eventTypeId: eventTypeId,
  //   userId: userId,
  // });

  // console.log("config", config);
  // if (!config || !config.yourPhoneNumber) {
  //   throw new TRPCError({
  //     code: "BAD_REQUEST",
  //     message: "AI not configured for this event type or no phone number is assigned.",
  //   });
  // }

  const aiService = createDefaultAIPhoneServiceProvider();

  const fromNumber = config.yourPhoneNumber.phoneNumber;
  const call = await aiService.createPhoneCall({
    fromNumber,
    toNumber: numberToCall,
    // dynamicVariables: {
    //   // Add any dynamic variables if needed
    // },
  });

  return call;
};
