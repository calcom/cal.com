import type { NextApiRequest, NextApiResponse } from "next";

import { getStripeIdsForTeam } from "@calcom/features/ee/teams/payments";

import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST" || req.method === "GET") {
    const referer = req.headers.referer;

    if (!referer) {
      res.status(500).json({ message: "Missing referer" });
      return;
    }

    // If accessing a user's portal
    if (referer.includes("/settings/billing")) {
      const customerId = await getStripeCustomerIdFromUserId(req.session!.user.id);
      if (!customerId) {
        res.status(500).json({ message: "Missing customer id" });
        return;
      }

      const return_url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/billing`;
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url,
      });
      res.redirect(302, stripeSession.url);
    }

    // If accessing a team's portal if referer has /settings/team/[:teamId]/billing
    if (/settings\/teams\/\d+\/billing/g.test(referer)) {
      // Grab the teamId by just matching /settings/teams/[:teamId]/billing and getting third item in array after split
      const teamId = referer.match(/\/(settings.+)/g) || "";
      const team = await getStripeIdsForTeam(parseInt(teamId[0].split("/")[3]));

      if (!team.stripeCustomerId) {
        res.status(500).json({ message: "Missing customer id" });
        return;
      }
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: team.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/teams/${teamId}/billing`,
      });
      res.redirect(302, stripeSession.url);
    }
  }
}
