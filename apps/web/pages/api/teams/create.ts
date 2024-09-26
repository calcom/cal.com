import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { z } from "zod";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

const querySchema = z.object({
  session_id: z.string().min(1),
});

const checkoutSessionMetadataSchema = z.object({
  teamName: z.string(),
  teamSlug: z.string(),
  userId: z.string().transform(Number),
});

const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 10);
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { session_id } = querySchema.parse(req.query);

  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["subscription"],
  });
  if (!checkoutSession) throw new HttpError({ statusCode: 404, message: "Checkout session not found" });

  const subscription = checkoutSession.subscription as Stripe.Subscription;

  if (checkoutSession.payment_status !== "paid")
    throw new HttpError({ statusCode: 402, message: "Payment required" });

  // Let's query to ensure that the team metadata carried over from the checkout session.
  const parseCheckoutSessionMetadata = checkoutSessionMetadataSchema.safeParse(checkoutSession.metadata);

  if (!parseCheckoutSessionMetadata.success) {
    console.error(
      "Team metadata not found in checkout session",
      parseCheckoutSessionMetadata.error,
      checkoutSession.id
    );
  }

  if (!checkoutSession.metadata?.userId) {
    throw new HttpError({
      statusCode: 400,
      message: "Can't publish team/org without userId",
    });
  }

  const checkoutSessionMetadata = parseCheckoutSessionMetadata.success
    ? parseCheckoutSessionMetadata.data
    : {
        teamName: checkoutSession?.metadata?.teamName ?? generateRandomString(),
        teamSlug: checkoutSession?.metadata?.teamSlug ?? generateRandomString(),
        userId: checkoutSession.metadata.userId,
      };

  const team = await prisma.team.create({
    data: {
      name: checkoutSessionMetadata.teamName,
      slug: checkoutSessionMetadata.teamSlug,
      members: {
        create: {
          userId: checkoutSessionMetadata.userId as number,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      metadata: {
        paymentId: checkoutSession.id,
        subscriptionId: subscription.id || null,
        subscriptionItemId: subscription.items.data[0].id || null,
      },
    },
  });

  // Sync Services: Close.com
  // closeComUpdateTeam(prevTeam, team);

  // redirect to team screen
  res.redirect(302, `/settings/teams/${team.id}/onboard-members?event=team_created`);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
