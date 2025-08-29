import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { prisma } from "@calcom/prisma";

import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });

  if (!req.session?.user?.id) return res.status(401).json({ message: "Not authenticated" });

  const userId = req.session.user.id;
  const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : null;
  let customerId: string | null = null;

  if (teamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
        OR: [{ role: "OWNER" }, { role: "ADMIN" }],
      },
    });

    if (!membership) {
      return res.status(403).json({ message: "Not authorized to access this team's billing" });
    }

    const teamWithBilling = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        platformBilling: true,
      },
    });

    if (teamWithBilling?.platformBilling?.subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          teamWithBilling.platformBilling.subscriptionId
        );
        customerId = subscription.customer as string;
      } catch (error) {
        console.error("Failed to retrieve subscription:", error);
        return res.status(400).json({ message: "Failed to retrieve subscription information" });
      }
    }
  }

  if (!customerId) {
    customerId = await getStripeCustomerIdFromUserId(userId);
  }

  if (!customerId) return res.status(400).json({ message: "CustomerId not found in stripe" });

  let return_url = `${WEBAPP_URL}/settings/billing`;

  if (typeof req.query.returnTo === "string") {
    const safeRedirectUrl = getSafeRedirectUrl(req.query.returnTo);
    if (safeRedirectUrl) return_url = safeRedirectUrl;
  }

  const stripeSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url,
  });

  res.redirect(302, stripeSession.url);
}
