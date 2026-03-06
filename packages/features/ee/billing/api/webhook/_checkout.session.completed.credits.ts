import { getCreditsRepository } from "@calcom/features/di/containers/CreditsRepository";
import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
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

  const creditsRepository = getCreditsRepository();

  const creditBalance = teamId
    ? await creditsRepository.upsertTeamBalance({ teamId, additionalCredits: nrOfCredits })
    : await creditsRepository.upsertUserBalance({ userId: userId!, additionalCredits: nrOfCredits });

  await creditsRepository.createCreditPurchaseLog({
    credits: nrOfCredits,
    creditBalanceId: creditBalance.id,
  });

  log.info("Credit purchase completed", { teamId, userId, nrOfCredits });

  return { success: true };
};

export default handler;
