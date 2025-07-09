import stripe from "@calcom/features/ee/payments/server/stripe";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

  // Handle phone number subscriptions
  if (session.metadata?.type === "phone_number_subscription") {
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
  const eventTypeId = session.metadata?.eventTypeId ? parseInt(session.metadata.eventTypeId, 10) : null;

  if (!userId || !session.subscription) {
    throw new HttpCode(400, "Missing required data for phone number subscription");
  }

  const { createPhoneNumber, updatePhoneNumber } = await import(
    "@calcom/features/ee/cal-ai-phone/retellAIService"
  );

  // Create the phone number through Retell API
  const retellPhoneNumber = await createPhoneNumber();

  // Extract subscription ID correctly
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    throw new HttpCode(400, "Invalid subscription data");
  }

  // Create the phone number in our database with subscription details
  const newNumber = await prisma.calAiPhoneNumber.create({
    data: {
      userId,
      phoneNumber: retellPhoneNumber.phone_number,
      provider: "retell",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
    },
  });

  // If eventTypeId is provided, assign agent to the new number
  if (eventTypeId) {
    const config = await prisma.aISelfServeConfiguration.findFirst({
      where: {
        eventTypeId: eventTypeId,
        eventType: {
          userId: userId,
        },
      },
    });

    if (config?.agentId) {
      // Assign agent to the new number via Retell API
      await updatePhoneNumber(retellPhoneNumber.phone_number, config.agentId);

      // Link the new number to the AI config
      await prisma.aISelfServeConfiguration.update({
        where: { id: config.id },
        data: { yourPhoneNumberId: newNumber.id },
      });
    }
  }

  return { success: true, phoneNumber: newNumber.phoneNumber };
}

export default handler;
