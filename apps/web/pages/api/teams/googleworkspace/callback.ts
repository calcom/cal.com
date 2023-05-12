import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

let client_id = "";
let client_secret = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { code } = req.query;

  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  const appKeys = await getAppKeysFromSlug("google-calendar");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (!client_id) return res.status(400).json({ message: "Google client_id missing." });
  if (!client_secret) return res.status(400).json({ message: "Google client_secret missing." });

  const redirect_uri = WEBAPP_URL + "/api/teams/googleworkspace/callback";
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  if (!code) {
    throw new Error("No code provided");
  }

  const credentials = await oAuth2Client.getToken(code);

  await prisma.credential.create({
    data: {
      type: "google_workspace_directory",
      key: credentials.res?.data,
      userId: session.user.id,
    },
  });

  res.redirect(
    getSafeRedirectUrl(WEBAPP_URL + "/settings/teams/1/?inviteModal=true&bulk=true") ?? `${WEBAPP_URL}/teams`
  );
}
