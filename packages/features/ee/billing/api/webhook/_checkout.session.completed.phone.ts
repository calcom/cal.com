import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { PrismaAgentRepository } from "@calcom/features/calAIPhone/repositories/PrismaAgentRepository";
import { PrismaPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const log = logger.getSubLogger({ prefix: ["checkout.session.completed.phone"] });

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;
  const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : null;
  const teamId = session.metadata?.teamId ? parseInt(session.metadata.teamId, 10) : null;
  const agentId = session.metadata?.agentId || null;

  if (!userId || !session.subscription) {
    log.error("Missing required data for phone number subscription", {
      userId,
      hasSubscription: !!session.subscription,
    });
    throw new HttpCode(400, "Missing required data for phone number subscription");
  }

  if (!agentId || agentId?.trim() === "") {
    log.error("Missing agentId for phone number subscription", { userId, teamId });
    throw new HttpCode(400, "Missing agentId for phone number subscription");
  }

  const agentRepo = new PrismaAgentRepository(prisma);
  const agent = await agentRepo.findByIdWithUserAccess({
    agentId,
    userId,
    teamId: teamId ?? undefined,
  });

  if (!agent) {
    log.error("Agent not found or user does not have access", { agentId, userId });
    throw new HttpCode(404, "Agent not found or user does not have access to it");
  }

  const aiService = createDefaultAIPhoneServiceProvider();

  const calAIPhoneNumber = await aiService.createPhoneNumber({
    nickname: `userId:${userId}${teamId ? `-teamId:${teamId}` : ""}-${Date.now()}`,
  });

  if (!calAIPhoneNumber?.phone_number) {
    log.error("Failed to create phone number - invalid response from Retell");
    throw new HttpCode(500, "Failed to create phone number - invalid response");
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    log.error("Invalid subscription data", { subscription: session.subscription });
    throw new HttpCode(400, "Invalid subscription data");
  }

  const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);
  const newNumber = await phoneNumberRepo.createPhoneNumber({
    userId,
    teamId: teamId ?? undefined,
    phoneNumber: calAIPhoneNumber.phone_number,
    provider: calAIPhoneNumber.provider,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
    providerPhoneNumberId: calAIPhoneNumber.phone_number,
  });

  try {
    log.debug("Attempting to link agent to phone number", { agentId, phoneNumberId: newNumber.id });

    const agentForLink = await agentRepo.findByIdWithUserAccess({
      agentId,
      userId,
    });

    if (!agentForLink) {
      log.error("Agent not found or user does not have access", { agentId, userId });
      throw new HttpCode(404, "Agent not found or user does not have access to it");
    }

    log.debug("Found agent", { agentId: agentForLink.id, providerAgentId: agentForLink.providerAgentId });

    await aiService.updatePhoneNumber(calAIPhoneNumber.phone_number, {
      outbound_agent_id: agentForLink.providerAgentId,
    });

    await prisma.calAiPhoneNumber.update({
      where: { id: newNumber.id },
      data: {
        outboundAgent: {
          connect: { id: agentId },
        },
      },
    });

    log.debug("Phone number successfully linked to agent");
  } catch (error) {
    log.error("Agent linking error details", {
      error,
      agentId,
      phoneNumber: calAIPhoneNumber.phone_number,
      userId,
    });
  }

  return { success: true, phoneNumber: newNumber.phoneNumber };
};

export default handler;
