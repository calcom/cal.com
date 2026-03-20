import { getCreditPurchaseLogRepository } from "@calcom/features/di/containers/CreditPurchaseLogRepository";
import { getCreditsRepository } from "@calcom/features/di/containers/CreditsRepository";
import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const log = logger.getSubLogger({ prefix: ["checkout.session.completed.credits"] });

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

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

  const creditPurchaseLogRepository = getCreditPurchaseLogRepository();

  const existing = await creditPurchaseLogRepository.findByStripeSessionId(session.id);

  if (existing) {
    log.info("Credit purchase already processed, skipping", { stripeSessionId: session.id, userId, teamId });
    return { success: true };
  }

  const creditsRepository = getCreditsRepository();

  try {
    await prisma.$transaction(async (tx) => {
      if (teamId) {
        const creditBalance = await creditsRepository.upsertTeamBalance(
          { teamId, additionalCredits: nrOfCredits },
          tx
        );
        await creditPurchaseLogRepository.create(
          {
            credits: nrOfCredits,
            creditBalanceId: creditBalance.id,
            stripeSessionId: session.id,
          },
          tx
        );
        return;
      }

      if (!userId) {
        throw new HttpCode(400, "Team id and user id are missing, but at least one is required");
      }

      const creditBalance = await creditsRepository.upsertUserBalance(
        { userId, additionalCredits: nrOfCredits },
        tx
      );
      await creditPurchaseLogRepository.create(
        {
          credits: nrOfCredits,
          creditBalanceId: creditBalance.id,
          stripeSessionId: session.id,
        },
        tx
      );
    });
  } catch (error) {
    log.error("saveToCreditBalance failed", {
      userId,
      teamId,
      nrOfCredits,
      stripeSessionId: session.id,
      error:
        error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });
    throw error;
  }

  log.info("Credit purchase completed", { teamId, userId, nrOfCredits });

  return { success: true };
};

export default handler;
