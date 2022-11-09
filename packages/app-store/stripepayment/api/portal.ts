import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });
  const { referer } = req.headers;

  if (!referer) return res.status(400).json({ message: "Missing referrer" });

  if (!req.session?.user?.id) return res.status(401).json({ message: "Not authenticated" });

  // If accessing a user's portal
  const customerId = await getStripeCustomerIdFromUserId(req.session.user.id);
  if (!customerId) return res.status(400).json({ message: "Missing customer id" });

  let return_url = `${WEBAPP_URL}/settings/billing`;

  // If accessing a team's portal if referrer has /settings/team/[:teamId]/billing
  if (/settings\/teams\/\d+\/billing/g.test(referer)) {
    // Grab the teamId by just matching /settings/teams/[:teamId]/billing and getting third item in array after split
    const teamId = referer.match(/\/(settings.+)/g) || "";
    return_url = `${WEBAPP_URL}/settings/teams/${teamId}/billing`;
    // TODO: Maybe create a customerId for each team. For now the owner is the customer.
  }

  const stripeSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url,
  });

  res.redirect(302, stripeSession.url);
}
