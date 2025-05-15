import stripe from "@calcom/features/ee/payments/server/stripe";
import prisma from "@calcom/prisma";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

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
  const creditBalance = await prisma.creditBalance.findUnique({
    where: {
      teamId,
      userId: !teamId ? userId : undefined,
    },
    select: {
      id: true,
    },
  });

  if (creditBalance) {
    await prisma.creditBalance.update({
      where: {
        id: creditBalance.id,
      },
      data: { additionalCredits: { increment: nrOfCredits }, limitReachedAt: null, warningSentAt: null },
    });
    return;
  }
  await prisma.creditBalance.create({
    data: {
      teamId: teamId,
      userId: !teamId ? userId : undefined,
      additionalCredits: nrOfCredits,
    },
  });
}
export default handler;
