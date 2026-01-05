import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { public_token } = req.query;
  if (!public_token || typeof public_token !== "string") {
    return res.status(400).json({ message: "Missing public token from Merge" });
  }

  const mergeApiKey = process.env.MERGE_API_KEY;
  if (!mergeApiKey) {
    return res.status(500).json({ message: "Merge API key not configured" });
  }

  try {
    const tokenResponse = await fetch("https://api.merge.dev/api/integrations/account-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${mergeApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ public_token }),
    });

    if (!tokenResponse.ok) {
      console.error("Failed to exchange Merge token:", await tokenResponse.text());
      return res.status(500).json({ message: "Failed to complete Lever connection" });
    }

    const { account_token, integration } = await tokenResponse.json();

    await prisma.credential.updateMany({
      where: { userId: req.session.user.id, type: `${appConfig.slug}_other_calendar` },
      data: { key: { account_token, integration } },
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
