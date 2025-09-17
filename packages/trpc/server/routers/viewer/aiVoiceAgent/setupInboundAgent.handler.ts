import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

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
    const { phoneNumber, teamId, workflowId } = input;
    const userId = ctx.user.id;
    const userTimeZone = ctx.user.timeZone || "UTC";

    // Validate phone number exists and belongs to user/team
    const phoneNumberRecord = await prisma.calAiPhoneNumber.findFirst({
      where: {
        phoneNumber,
        ...(teamId ? { teamId } : { userId }),
      },
      select: {
        id: true,
        inboundAgentId: true,
      },
    });

    if (!phoneNumberRecord) {
      throw new HttpError({
        statusCode: 404,
        message: "Phone number not found or you don't have access to it",
      });
    }

    // Check if inbound agent already exists
    if (phoneNumberRecord.inboundAgentId) {
      throw new HttpError({
        statusCode: 400,
        message: "Inbound agent already configured for this phone number",
      });
    }


    // Use the validated phone number from phoneNumberRecord

    const aiService = createDefaultAIPhoneServiceProvider();

    // Create the inbound agent with inbound-specific configuration
    const createAgentResult = await aiService.createInboundAgent({
      name: `Inbound Agent - ${phoneNumber}`,
      userId,
      teamId,
      workflowId,
      userTimeZone,
    });

    // Update the phone number to use the inbound agent
    await aiService.updatePhoneNumberWithAgents({
      phoneNumber,
      userId,
      teamId,
      inboundAgentId: createAgentResult.providerAgentId,
    });

    // Update the database records
    await prisma.calAiPhoneNumber.update({
      where: { id: phoneNumberRecord.id },
      data: {
        inboundAgentId: createAgentResult.id,
      },
    });

    log.info("Inbound agent setup completed", {
      phoneNumber,
      agentId: createAgentResult.id,
      providerAgentId: createAgentResult.providerAgentId,
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

    throw new HttpError({
      statusCode: 500,
      message: "Failed to setup inbound agent",
    });
  }
};