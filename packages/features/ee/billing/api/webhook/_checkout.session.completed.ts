import stripe from "@calcom/app-store/stripepayment/lib/server";
import prisma from "@calcom/prisma";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;
  if (!session.client_reference_id || !session.amount_total) {
    throw new HttpCode(400, "Missing required payment details");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: Number(session.client_reference_id),
    },
  });

  if (!user) {
    throw new HttpCode(404, "User not found");
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const priceId = lineItems.data[0].price?.id;
  const nrOfCredits = lineItems.data[0].quantity;

  if (!priceId || priceId !== process.env.STRIPE_CREDITS_PRICE_ID || !nrOfCredits) {
    throw new HttpCode(400, "Invalid price ID");
  }

  const teamId = session.metadata?.teamId ? Number(session.metadata.teamId) : null;

  let creditBalance: { id: string } | null;
  if (teamId) {
    creditBalance = await prisma.creditBalance.findUnique({
      where: {
        teamId,
      },
    });
  } else {
    creditBalance = await prisma.creditBalance.findUnique({
      where: {
        userId: user.id,
      },
    });
  }

  if (creditBalance) {
    await prisma.creditBalance.update({
      where: {
        id: creditBalance.id,
      },
      data: { additionalCredits: { increment: nrOfCredits }, limitReachedAt: null },
    });
  } else {
    await prisma.creditBalance.create({
      data: {
        teamId: teamId ? teamId : undefined,
        userId: teamId ? undefined : user.id,
        additionalCredits: nrOfCredits,
      },
    });
  }

  return { success: true };
};

export default handler;
