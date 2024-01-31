import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { z } from "zod";

import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import stripe from "@calcom/features/ee/payments/server/stripe";
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

  let metadata;

  if (!team) {
    const prevTeam = await prisma.team.findFirstOrThrow({ where: { id } });

    metadata = teamMetadataSchema.safeParse(prevTeam.metadata);
    if (!metadata.success) throw new HttpError({ statusCode: 400, message: "Invalid team metadata" });

    if (!metadata.data?.requestedSlug) {
      throw new HttpError({
        statusCode: 400,
        message: "Can't publish team/org without `requestedSlug`",
      });
    }

    const { requestedSlug, ...newMetadata } = metadata.data;
    /** We save the metadata first to prevent duplicate payments */
    team = await prisma.team.update({
      where: { id },
      data: {
        metadata: {
          ...newMetadata,
          paymentId: checkoutSession.id,
          subscriptionId: subscription.id || null,
          subscriptionItemId: subscription.items.data[0].id || null,
        },
      },
    });
    /** Legacy teams already have a slug, this will allow them to upgrade as well */
    const slug = prevTeam.slug || requestedSlug;
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

  if (!metadata) {
    metadata = teamMetadataSchema.safeParse(team.metadata);
    if (!metadata.success) throw new HttpError({ statusCode: 400, message: "Invalid team metadata" });
  }

  const session = await getServerSession({ req, res });

  if (!session) return { message: "Team upgraded successfully" };

  const redirectUrl = metadata?.data?.isOrganization
    ? `${WEBAPP_URL}/settings/organizations/profile?upgraded=true`
    : `${WEBAPP_URL}/settings/teams/${team.id}/profile?upgraded=true`;

  // redirect to team screen
  res.redirect(302, redirectUrl);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
