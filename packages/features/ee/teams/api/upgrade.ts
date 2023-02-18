import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { z } from "zod";

import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { getSession } from "@calcom/lib/auth";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const querySchema = z.object({
  team: z.string().transform((val) => parseInt(val)),
  session_id: z.string().min(1),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { team: id, session_id } = querySchema.parse(req.query);

  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["subscription"],
  });
  if (!checkoutSession) throw new HttpError({ statusCode: 404, message: "Checkout session not found" });

  const subscription = checkoutSession.subscription as Stripe.Subscription;
  if (checkoutSession.payment_status !== "paid")
    throw new HttpError({ statusCode: 402, message: "Payment required" });

  /* Check if a team was already upgraded with this payment intent */
  let team = await prisma.team.findFirst({
    where: { metadata: { path: ["paymentId"], equals: checkoutSession.id } },
  });

  if (!team) {
    const prevTeam = await prisma.team.findFirstOrThrow({ where: { id } });
    const metadata = teamMetadataSchema.parse(prevTeam.metadata);
    /** We save the metadata first to prevent duplicate payments */
    team = await prisma.team.update({
      where: { id },
      data: {
        metadata: {
          paymentId: checkoutSession.id,
          subscriptionId: subscription.id || null,
          subscriptionItemId: subscription.items.data[0].id || null,
        },
      },
    });
    /** Legacy teams already have a slug, this will allow them to upgrade as well */
    const slug = prevTeam.slug || metadata?.requestedSlug;
    if (slug) {
      try {
        /** Then we try to upgrade the slug, which may fail if a conflict came up since team creation */
        team = await prisma.team.update({ where: { id }, data: { slug } });
      } catch (error) {
        const { message, statusCode } = getRequestedSlugError(error, slug);
        return res.status(statusCode).json({ message });
      }
    }

    // Sync Services: Close.com
    closeComUpdateTeam(prevTeam, team);
  }

  const session = await getSession({ req });

  if (!session) return { message: "Team upgraded successfully" };

  // redirect to team screen
  res.redirect(302, `${WEBAPP_URL}/settings/teams/${team.id}/profile?upgraded=true`);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
