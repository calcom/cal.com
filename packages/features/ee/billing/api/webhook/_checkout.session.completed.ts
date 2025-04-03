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

  /*
    already schedule SMS are still sent via email (SMS are scheduled 2 hours in advance)
    new SMS are scheduled as per normal
  */
  if (teamId) {
    prisma.creditBalance.upsert({
      where: {
        teamId: teamId,
      },
      update: {
        additionalCredits: { increment: nrOfCredits },
        limitReachedAt: null,
      },
      create: {
        teamId: teamId,
        additionalCredits: nrOfCredits,
      },
      select: {
        additionalCredits: true,
        limitReachedAt: true,
      },
    });
  } else {
    await prisma.creditBalance.upsert({
      where: {
        userId: user.id,
      },
      update: {
        additionalCredits: { increment: nrOfCredits },
        limitReachedAt: null,
      },
      create: {
        userId: user.id,
        additionalCredits: nrOfCredits,
      },
      select: {
        additionalCredits: true,
      },
    });
  }
};

export default handler;
