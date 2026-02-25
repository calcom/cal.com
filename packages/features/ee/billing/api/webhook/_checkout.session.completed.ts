import { CreditsRepository } from "@calcom/features/credits/repositories/CreditsRepository";
import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import { CHECKOUT_SESSION_TYPES } from "../../constants";
import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const log = logger.getSubLogger({ prefix: ["checkout.session.completed"] });

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

  // Store ad tracking data in Stripe customer metadata for Zapier tracking
  if (session.customer && session.metadata) {
    try {
      const trackingMetadata = {
        gclid: session.metadata?.gclid,
        campaignId: session.metadata?.campaignId,
        liFatId: session.metadata?.liFatId,
        linkedInCampaignId: session.metadata?.linkedInCampaignId,
      };

      const cleanedMetadata = Object.fromEntries(
        Object.entries(trackingMetadata).filter(([_, value]) => value)
      );

      if (Object.keys(cleanedMetadata).length > 0) {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
        await stripe.customers.update(customerId, {
          metadata: cleanedMetadata,
        });
      }
    } catch (error) {
      log.error("Failed to update Stripe customer metadata with ad tracking data", { error });
    }
  }

  if (session.metadata?.type === CHECKOUT_SESSION_TYPES.TEAM_CREATION) {
    return await handleTeamCreationCheckoutSessionComplete(session);
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

async function handleTeamCreationCheckoutSessionComplete(
  session: SWHMap["checkout.session.completed"]["data"]["object"]
) {
  log.info("Team creation checkout session completed - handled via redirect flow", {
    sessionId: session.id,
    teamName: session.metadata?.teamName,
    teamSlug: session.metadata?.teamSlug,
  });
  return { success: true, message: "Team checkout handled via redirect" };
}

export default handler;
