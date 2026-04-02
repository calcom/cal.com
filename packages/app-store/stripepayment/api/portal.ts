import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";
import { BillingPortalServiceFactory } from "../lib/BillingPortalService";

interface AuthenticatedUser {
  id: number;
}

interface RequestWithSession extends NextApiRequest {
  session?: Session | null;
}

export const validateAuthentication = (req: NextApiRequest): AuthenticatedUser | null => {
  const userId = (req as RequestWithSession).session?.user?.id;
  if (!userId) return null;
  return { id: userId };
};

export const buildReturnUrl = (returnTo?: string): string => {
  const defaultUrl = `${WEBAPP_URL}/settings/billing`;

  if (typeof returnTo !== "string") return defaultUrl;

  const safeRedirectUrl = getSafeRedirectUrl(returnTo);
  return safeRedirectUrl || defaultUrl;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = validateAuthentication(req);
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : null;
  const returnUrl = buildReturnUrl(req.query.returnTo as string);

  try {
    if (!teamId) {
      const userService = BillingPortalServiceFactory.createUserService();
      return await userService.processBillingPortal(user.id, returnUrl, res);
    }

    const billingService = await BillingPortalServiceFactory.createService(teamId);
    return await billingService.processBillingPortal(user.id, teamId, returnUrl, res);
  } catch (error) {
    if (error instanceof Error && error.message === "Team not found") {
      return res.status(404).json({ message: "Team not found" });
    }
    throw error;
  }
}
