import { OAuth2Client } from "googleapis-common";
import type { NextApiRequest, NextApiResponse } from "next";

import { GOOGLE_CALENDAR_SCOPES, SCOPE_USERINFO_PROFILE, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { getGoogleAppKeys } from "../lib/getGoogleAppKeys";
import prisma from "@calcom/prisma";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  // Get token from Google Calendar API
  const { client_id, client_secret } = await getGoogleAppKeys();
  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlecalendar/callback`;
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [SCOPE_USERINFO_PROFILE, ...GOOGLE_CALENDAR_SCOPES],
    // A refresh token is only returned the first time the user
    // consents to providing access.  For illustration purposes,
    // setting the prompt to 'consent' will force this consent
    // every time, forcing a refresh_token to be returned.
    prompt: "consent",
    state: encodeOAuthState(req),
  });

  res.status(200).json({ url: authUrl });
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, notificationTimes } = req.body;

  if (!userId || !Array.isArray(notificationTimes)) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    await prisma.userPreferences.upsert({
      where: { userId },
      update: { notificationTimes },
      create: { userId, notificationTimes },
    });

    res.status(200).json({ message: "Notification times updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification times" });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
