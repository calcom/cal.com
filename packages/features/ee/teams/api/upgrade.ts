import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { z } from "zod";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { ensureSession } from "@calcom/lib/auth";
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
  await ensureSession({ req });

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
    if (!metadata?.requestedSlug) throw new HttpError({ statusCode: 400, message: "Missing requestedSlug" });

    try {
      team = await prisma.team.update({
        where: { id },
        data: {
          slug: metadata.requestedSlug,
          metadata: {
            paymentId: checkoutSession.id,
            subscriptionId: subscription.id || null,
            subscriptionItemId: subscription.items.data[0].id || null,
          },
        },
      });
    } catch (error) {
      let message = `Unknown error`;
      let statusCode = 500;
      // This covers the edge case if an unpublished team takes too long to publish
      // and another team gets the requestedSlug first.
      // https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        statusCode = 400;
        message = `It seems like the requestedSlug: '${metadata.requestedSlug}' is already taken. Please contact support so we can resolve this issue.`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      return res.status(statusCode).json({ message });
    }

    // Sync Services: Close.com
    closeComUpdateTeam(prevTeam, team);
  }

  // redirect to team screen
  res.redirect(302, `${WEBAPP_URL}/settings/teams/${team.id}/profile?upgraded=true`);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
