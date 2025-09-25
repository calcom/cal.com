import { CalendlyOAuthProvider } from "@onehash/calendly";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { IntegrationProvider } from "@calcom/prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, userId } = req.query;

    // Validate required parameters
    if (!code || !userId || typeof code !== "string" || typeof userId !== "string") {
      return res.status(400).json({ error: "Missing code or userId parameter" });
    }

    const calendlyOAuthProvider = new CalendlyOAuthProvider({
      clientId: process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID ?? "",
      clientSecret: process.env.CALENDLY_CLIENT_SECRET ?? "",
      redirectUri: process.env.NEXT_PUBLIC_CALENDLY_REDIRECT_URI ?? "",
      oauthUrl: process.env.NEXT_PUBLIC_CALENDLY_OAUTH_URL ?? "",
    });

    const { access_token, refresh_token, token_type, expires_in, created_at, owner } =
      await calendlyOAuthProvider.getAccessToken(code);

    // Check if integration account for the user exists
    const integrationAccount = await prisma.integrationAccounts.findFirst({
      where: {
        userId: parseInt(userId),
        provider: IntegrationProvider.CALENDLY,
      },
    });

    // If already exists update the token configs
    if (integrationAccount) {
      await prisma.integrationAccounts.update({
        where: {
          userId_provider: {
            userId: parseInt(userId),
            provider: IntegrationProvider.CALENDLY,
          },
        },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenType: token_type,
          expiresIn: expires_in,
          createdAt: created_at,
          ownerUniqIdentifier: owner,
        },
      });
    } else {
      // Else adding new integration account and linking to user
      await prisma.user.update({
        where: {
          id: parseInt(userId),
        },
        data: {
          integrationAccounts: {
            create: {
              accessToken: access_token,
              refreshToken: refresh_token,
              tokenType: token_type,
              expiresIn: expires_in,
              createdAt: created_at,
              provider: IntegrationProvider.CALENDLY,
              ownerUniqIdentifier: owner,
            },
          },
        },
      });
      console.log("Creating new integration account and linking to user");
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("OAuth callback error:", String(error));
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
