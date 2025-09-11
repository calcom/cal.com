import type { NextApiRequest, NextApiResponse } from "next";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";
import { getSubscriptionFromId } from "../lib/subscriptions";

const getBillingPortalUrl = async (customerId: string, return_url: string) => {
  const log = logger.getSubLogger({ prefix: ["getBillingPortalUrl"] });
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    return portalSession.url;
  } catch (e) {
    log.error(`Failed to create billing portal session for ${customerId}: ${e}`);
    throw new Error("Failed to create billing portal session");
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });

  if (!req.session?.user?.id) return res.status(401).json({ message: "Not authenticated" });

  const userId = req.session.user.id;
  const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : null;
  let return_url = `${WEBAPP_URL}/settings/billing`;
  if (!teamId) {
    const customerId = await getStripeCustomerIdFromUserId(userId);
    if (!customerId) return res.status(404).json({ message: "CustomerId not found" });

    const billingPortalUrl = await getBillingPortalUrl(customerId, return_url);

    return res.redirect(302, billingPortalUrl);
  }

  const permissionCheckService = new PermissionCheckService();
  // Esnsure user has access to teamBilling

  // I think here we need to check if this team is an ORG or TEAM
  // Then we check if the user can access on that level. for team.manageBilling or organization.manageBilling
  // Currently we only have manageBilling on organization level but we need it on a team level for NONE orgs (Maybe we dont put it in the registery?)

  const teamRepository = new TeamRepository(prisma);
  const team = await teamRepository.findById({
    id: teamId,
  });

  if (!team) return res.status(404).json({ message: "Team not found" });

  const hasPermisison = await permissionCheckService.checkPermission({
    userId,
    teamId,
    permission: team.isOrganization ? "organization.manageBilling" : "team.manageBilling",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermisison) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (typeof req.query.returnTo === "string") {
    const safeRedirectUrl = getSafeRedirectUrl(req.query.returnTo);
    if (safeRedirectUrl) return_url = safeRedirectUrl;
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

  const billingPortalUrl = await getBillingPortalUrl(customerId, return_url);

  res.redirect(302, billingPortalUrl);
}
