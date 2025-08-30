import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";
import { getSubscriptionFromId } from "../lib/subscriptions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });

  if (!req.session?.user?.id) return res.status(401).json({ message: "Not authenticated" });

  const userId = req.session.user.id;
  const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : null;

  if (!teamId) {
    return res.status(400).json({ message: "Team ID is required" });
  }

  const teamRepository = new TeamRepository(prisma);
  const team = await teamRepository.getTeamByIdIfUserIsAdmin({
    teamId,
    userId,
  });
  let return_url = `${WEBAPP_URL}/settings/billing`;

  if (typeof req.query.returnTo === "string") {
    const safeRedirectUrl = getSafeRedirectUrl(req.query.returnTo);
    if (safeRedirectUrl) return_url = safeRedirectUrl;
  }

  if (!team) {
    const customerId = await getStripeCustomerIdFromUserId(userId);
    if (!customerId) return res.status(404).json({ message: "CustomerId not found" });

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    return res.status(200).json({ url: portalSession.url });
  }

  const teamMetadataParsed = teamMetadataSchema.safeParse(team.metadata);

  if (!teamMetadataParsed.success) {
    return res.status(400).json({ message: "Invalid team metadata" });
  }

  if (!teamMetadataParsed.data?.subscriptionId) {
    return res.status(400).json({ message: "subscriptionId not found for team" });
  }

  const subscription = await getSubscriptionFromId(teamMetadataParsed.data.subscriptionId);

  if (!subscription) {
    return res.status(400).json({ message: "Subscription not found" });
  }

  if (!subscription.customer) {
    return res.status(400).json({ message: "Subscription customer not found" });
  }

  const customerId = subscription.customer as string;

  if (!customerId) return res.status(400).json({ message: "CustomerId not found in stripe" });

  const stripeSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url,
  });

  res.redirect(302, stripeSession.url);
}
