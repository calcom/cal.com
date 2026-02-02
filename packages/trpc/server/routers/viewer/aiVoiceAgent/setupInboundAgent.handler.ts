import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TSetupInboundAgentInputSchema } from "./setupInboundAgent.schema";

type SetupInboundAgentHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetupInboundAgentInputSchema;
};

export const setupInboundAgentHandler = async ({ ctx, input }: SetupInboundAgentHandlerOptions) => {
  const log = logger.getSubLogger({ prefix: ["setupInboundAgentHandler"] });

  try {
    const { phoneNumber, teamId, workflowStepId } = input;
    const userId = ctx.user.id;
    const userTimeZone = ctx.user.timeZone || "UTC";

    const aiService = createDefaultAIPhoneServiceProvider();

    const createAgentResult = await aiService.createInboundAgent({
      name: `Inbound Agent - ${phoneNumber}`,
      phoneNumber,
      userId,
      teamId,
      workflowStepId,
      userTimeZone,
    });

    return {
      success: true,
      agentId: createAgentResult.id,
      message: "Inbound agent configured successfully",
    };
  } catch (error) {
    log.error("Failed to setup inbound agent", { error });

    if (error instanceof HttpError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to setup inbound agent",
    });
  }
};
