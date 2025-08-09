import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { AgentRepository } from "@calcom/lib/server/repository/agent";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

  console.log("Webhook received - checkout.session.completed", {
    sessionId: session.id,
    metadata: session.metadata,
    type: session.metadata?.type,
    paymentStatus: session.payment_status,
    subscription: session.subscription,
  });

  // Handle phone number subscriptions
  if (session.metadata?.type === "phone_number_subscription") {
    console.log("Processing phone number subscription", {
      sessionId: session.id,
      userId: session.metadata?.userId,
      teamId: session.metadata?.teamId,
      agentId: session.metadata?.agentId,
    });
    return await handlePhoneNumberSubscription(session);
  }

  // Handle credit purchases (existing logic)
  if (!session.amount_total) {
    throw new HttpCode(400, "Missing required payment details");
  }

  const teamId = session.metadata?.teamId ? Number(session.metadata.teamId) : undefined;
  const userId = session.metadata?.userId ? Number(session.metadata.userId) : undefined;

  if (!teamId && !userId) {
    throw new HttpCode(400, "Team id and user id are missing, but at least one is required");
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const priceId = lineItems.data[0]?.price?.id;
  const nrOfCredits = lineItems.data[0]?.quantity ?? 0;

  if (!priceId || priceId !== process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID || !nrOfCredits) {
    throw new HttpCode(400, "Invalid price ID");
  }

  await saveToCreditBalance({ userId, teamId, nrOfCredits });

  return { success: true };
};

async function saveToCreditBalance({
  userId,
  teamId,
  nrOfCredits,
}: {
  userId?: number;
  teamId?: number;
  nrOfCredits: number;
}) {
  const creditBalance = await CreditsRepository.findCreditBalance({ teamId, userId });

  let creditBalanceId = creditBalance?.id;

  if (creditBalance) {
    await CreditsRepository.updateCreditBalance({
      id: creditBalance.id,
      data: { additionalCredits: { increment: nrOfCredits }, limitReachedAt: null, warningSentAt: null },
    });
  } else {
    const newCreditBalance = await CreditsRepository.createCreditBalance({
      teamId: teamId,
      userId: !teamId ? userId : undefined,
      additionalCredits: nrOfCredits,
    });
    creditBalanceId = newCreditBalance.id;
  }

  if (creditBalanceId) {
    await CreditsRepository.createCreditPurchaseLog({
      credits: nrOfCredits,
      creditBalanceId,
    });
  }
}

async function handlePhoneNumberSubscription(session: any) {
  const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : null;
  const teamId = session.metadata?.teamId ? parseInt(session.metadata.teamId, 10) : null;
  const agentId = session.metadata?.agentId || null;

  console.log("handlePhoneNumberSubscription called", {
    sessionId: session.id,
    userId,
    teamId,
    agentId,
    subscription: session.subscription,
    customer: session.customer,
    paymentStatus: session.payment_status,
  });

  if (!userId || !session.subscription) {
    console.error("Missing required data for phone number subscription", {
      userId,
      hasSubscription: !!session.subscription,
    });
    throw new HttpCode(400, "Missing required data for phone number subscription");
  }

  console.log("Creating AI service provider...");
  const aiService = createDefaultAIPhoneServiceProvider();

  console.log("Creating phone number with Retell...");
  const retellPhoneNumber = await aiService.createPhoneNumber({ nickname: `${userId}-${Date.now()}` });

  console.log("Retell phone number response", {
    success: !!retellPhoneNumber?.phone_number,
    phoneNumber: retellPhoneNumber?.phone_number,
  });

  if (!retellPhoneNumber?.phone_number) {
    console.error("Failed to create phone number - invalid response from Retell");
    throw new HttpCode(500, "Failed to create phone number - invalid response");
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  console.log("Subscription ID extracted", { subscriptionId });

  if (!subscriptionId) {
    console.error("Invalid subscription data", { subscription: session.subscription });
    throw new HttpCode(400, "Invalid subscription data");
  }

  console.log("Creating phone number record in database...");
  const newNumber = await prisma.calAiPhoneNumber.create({
    data: {
      userId,
      teamId,
      phoneNumber: retellPhoneNumber.phone_number,
      provider: "retell",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
    },
  });

  console.log("Phone number created successfully", {
    phoneNumberId: newNumber.id,
    phoneNumber: newNumber.phoneNumber,
  });

  // If agentId is provided, link the phone number to the agent
  if (agentId) {
    console.log("Linking phone number to agent", { agentId });
    try {
      const agent = await AgentRepository.findByIdWithUserAccess({
        agentId,
        userId,
      });

      if (!agent) {
        console.error("Agent not found or user does not have access", { agentId, userId });
        throw new HttpCode(404, "Agent not found or user does not have access to it");
      }

      console.log("Agent found, updating phone number with Retell...");
      // Assign agent to the new number via Retell API
      await aiService.updatePhoneNumber(retellPhoneNumber.phone_number, {
        outbound_agent_id: agent.retellAgentId,
      });

      console.log("Linking phone number to agent in database...");
      // Link the new number to the agent in our database
      await prisma.calAiPhoneNumber.update({
        where: { id: newNumber.id },
        data: {
          outboundAgent: {
            connect: { id: agentId },
          },
        },
      });

      console.log("Phone number successfully linked to agent");
    } catch (error) {
      console.error("Agent linking error details:", {
        error,
        agentId,
        phoneNumber: retellPhoneNumber.phone_number,
        userId,
      });
    }
  }

  console.log("Phone number subscription completed successfully");
  return { success: true, phoneNumber: newNumber.phoneNumber };
}

export default handler;
