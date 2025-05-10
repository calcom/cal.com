import type { NextApiRequest, NextApiResponse } from "next";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (code === undefined && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const existingUser = await prisma.credential.findFirst({
    where: {
      appId: appConfig.slug,
      userId: req.session?.user.id,
    },
  });

  if (existingUser) {
    res.status(200).json({ message: `${appConfig.name} already installed` });
    return;
  }

  const { client_id, client_secret } = await getAppKeysFromSlug("slack");
  if (!client_id || !client_secret)
    return res.status(400).json({ message: "Slack client_id or client_secret missing." });

  try {
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: client_id as string,
        client_secret: client_secret as string,
        code: code as string,
        redirect_uri: `${WEBAPP_URL}/api/integrations/slack/callback`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Failed to exchange code for token.");
    }

    const { authed_user, access_token } = data;
    const slackUserId = authed_user.id;
    const slackUserBotToken = access_token;

    await createDefaultInstallation({
      appType: appConfig.type,
      user: req.session.user,
      slug: appConfig.slug,
      key: { slackUserId, slackUserBotToken },
    });

    res.status(200).json({ message: "Slack account connected successfully!" });
    res.redirect(getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug }));
  } catch (error) {
    console.error("Error during Slack OAuth callback:", error);

    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(500).json({ message: "An unexpected error occurred." });
  }
}
