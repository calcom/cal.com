import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TTestCallInputSchema } from "./testCall.schema";

type TestCallHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TTestCallInputSchema;
};

export const testCallHandler = async ({ ctx, input }: TestCallHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();
  const timeZone = ctx.user.timeZone ?? "Europe/London";
  const eventTypeRepo = new EventTypeRepository(prisma);
  const eventType = await eventTypeRepo.getFirstEventTypeByUserId({ userId: ctx.user.id });
  if (!eventType?.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No event type found for user",
    });
  }

  return await aiService.createTestCall({
    agentId: input.agentId,
    phoneNumber: input.phoneNumber,
    userId: ctx.user.id,
    teamId: input.teamId,
    timeZone,
    eventTypeId: eventType.id,
  });
};
