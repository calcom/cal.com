import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { PrismaAgentRepository } from "@calcom/lib/server/repository/PrismaAgentRepository";
import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { CHECKOUT_SESSION_TYPES } from "../../constants";
import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

  if (session.metadata?.type === CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION) {
    return await handleCalAIPhoneNumberSubscription(session);
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

/**
 * Adds purchased credits to an existing credit balance or creates a new balance, then logs the purchase.
 *
 * If a credit balance exists for the given teamId/userId it increments its additionalCredits by `nrOfCredits`
 * and clears `limitReachedAt` and `warningSentAt`. If no balance exists it creates one (userId is only set on
 * the new balance when no teamId is provided). After updating or creating a balance, a credit purchase log is recorded.
 *
 * @param userId - Optional user ID to attribute the credits to; only applied to a newly created balance when `teamId` is not provided.
 * @param teamId - Optional team ID to attribute the credits to; when present, credits are associated with the team balance.
 * @param nrOfCredits - Number of credits to add; must be a positive integer representing purchased credits.
 */
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

/**
 * Handle a Stripe Checkout Session for a CalAI phone-number subscription.
 *
 * Validates session metadata (requires a numeric `userId`, `subscription` and a non-empty `agentId`), creates a provider phone number via the default AI phone service, persists the phone number record, and attempts to link the new number to the specified agent. Returns the created phone number on success. Linking errors are logged but do not fail the overall flow.
 *
 * @param session - The Stripe checkout session object from the `checkout.session.completed` webhook. Expected to include `metadata.userId` (string numeric), optional `metadata.teamId` (string numeric), `metadata.agentId` (string), and `subscription`/`customer` fields.
 * @returns An object with `{ success: true, phoneNumber: string }` where `phoneNumber` is the persisted number.
 * @throws HttpCode 400 if required session data is missing or invalid (missing `userId`, missing `subscription`, missing/blank `agentId`, or invalid subscription id).
 * @throws HttpCode 404 if the referenced agent cannot be found or the user lacks access.
 * @throws HttpCode 500 if the AI phone provider returns an invalid response when creating the phone number.
 */
async function handleCalAIPhoneNumberSubscription(
  session: SWHMap["checkout.session.completed"]["data"]["object"]
) {
  const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : null;
  const teamId = session.metadata?.teamId ? parseInt(session.metadata.teamId, 10) : null;
  const agentId = session.metadata?.agentId || null;

  if (!userId || !session.subscription) {
    console.error("Missing required data for phone number subscription", {
      userId,
      hasSubscription: !!session.subscription,
    });
    throw new HttpCode(400, "Missing required data for phone number subscription");
  }

  if (!agentId || agentId?.trim() === "") {
    console.error("Missing agentId for phone number subscription", {
      userId,
      teamId,
    });
    throw new HttpCode(400, "Missing agentId for phone number subscription");
  }

  const agent = await PrismaAgentRepository.findByIdWithUserAccess({
    agentId,
    userId,
    teamId: teamId ?? undefined,
  });

  if (!agent) {
    console.error("Agent not found or user does not have access", { agentId, userId });
    throw new HttpCode(404, "Agent not found or user does not have access to it");
  }

  const aiService = createDefaultAIPhoneServiceProvider();

  const calAIPhoneNumber = await aiService.createPhoneNumber({
    nickname: `userId:${userId}${teamId ? `-teamId:${teamId}` : ""}-${Date.now()}`,
  });

  if (!calAIPhoneNumber?.phone_number) {
    console.error("Failed to create phone number - invalid response from Retell");
    throw new HttpCode(500, "Failed to create phone number - invalid response");
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error("Invalid subscription data", { subscription: session.subscription });
    throw new HttpCode(400, "Invalid subscription data");
  }

  const newNumber = await PrismaPhoneNumberRepository.createPhoneNumber({
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
    console.log("Attempting to link agent to phone number:", { agentId, phoneNumberId: newNumber.id });

    const agent = await PrismaAgentRepository.findByIdWithUserAccess({
      agentId,
      userId,
    });

    if (!agent) {
      console.error("Agent not found or user does not have access", { agentId, userId });
      throw new HttpCode(404, "Agent not found or user does not have access to it");
    }

    console.log("Found agent:", { agentId: agent.id, providerAgentId: agent.providerAgentId });

    // Assign agent to the new number via Retell API
    await aiService.updatePhoneNumber(calAIPhoneNumber.phone_number, {
      outbound_agent_id: agent.providerAgentId,
    });

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
      phoneNumber: calAIPhoneNumber.phone_number,
      userId,
    });
  }

  return { success: true, phoneNumber: newNumber.phoneNumber };
}

export default handler;
