import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

/**
 * Callback handler for Merge.dev OAuth flow.
 * This receives the account token after the user successfully connects their Lever account.
 *
 * Merge.dev OAuth Documentation:
 * https://docs.merge.dev/guides/merge-link/
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = req.session;

  if (!session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { public_token } = req.query;

  if (!public_token || typeof public_token !== "string") {
    return res.status(400).json({ message: "Missing public token from Merge" });
  }

  const mergeApiKey = process.env.MERGE_API_KEY;
  if (!mergeApiKey) {
    return res.status(400).json({ message: "Merge API key not configured" });
  }

  try {
    // Exchange public token for account token
    const tokenResponse = await fetch("https://api.merge.dev/api/integrations/account-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mergeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to exchange Merge token:", errorText);
      return res.status(500).json({ message: "Failed to complete Lever connection" });
    }

    const { account_token, integration } = await tokenResponse.json();

    // Update the credential with the account token
    await prisma.credential.updateMany({
      where: {
        userId: session.user.id,
        type: `${appConfig.slug}_other_calendar`,
      },
      data: {
        key: {
          account_token,
          integration,
        },
      },
    });

    const state = decodeOAuthState(req);
    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ??
        getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug })
    );
  } catch (error) {
    console.error("Error in Lever callback handler:", error);
    return res.status(500).json({ message: "Failed to complete Lever connection" });
  }
}
