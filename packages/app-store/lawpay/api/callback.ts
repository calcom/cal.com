import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ message: "Missing authorization code" });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      `${process.env.LAWPAY_API_URL || "https://api.lawpay.com"}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: process.env.LAWPAY_CLIENT_ID,
          client_secret: process.env.LAWPAY_CLIENT_SECRET,
          redirect_uri: `${WEBAPP_URL}/api/integrations/lawpay/callback`,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange authorization code");
    }

    const tokenData = await tokenResponse.json();

    // Decode state to get user information
    const stateData = state ? JSON.parse(Buffer.from(state as string, "base64").toString()) : {};
    const userId = stateData.userId;

    if (!userId) {
      return res.status(400).json({ message: "Missing user information" });
    }

    // Store credentials in database
    await prisma.credential.create({
      data: {
        type: "lawpay_payment",
        key: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Date.now() + tokenData.expires_in * 1000,
          client_id: process.env.LAWPAY_CLIENT_ID,
          client_secret: process.env.LAWPAY_CLIENT_SECRET,
          public_key: process.env.NEXT_PUBLIC_LAWPAY_PUBLIC_KEY,
        },
        userId,
        appId: "lawpay",
      },
    });

    // Redirect back to app installation flow
    const redirectUrl = stateData.returnTo || `${WEBAPP_URL}/apps/installed/payment`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("LawPay OAuth callback error:", error);
    return res.status(500).json({ message: "OAuth callback failed" });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: getHandler }),
});
