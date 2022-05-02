import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { encodeOAuthState } from "../../_utils/encodeOAuthState";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const scopes = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

let client_id = "";
let client_secret = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get token from Google Calendar API
    const appKeys = await getAppKeysFromSlug("google-calendar");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
    if (!client_id) return res.status(400).json({ message: "Google client_id missing." });
    if (!client_secret) return res.status(400).json({ message: "Google client_secret missing." });
    const redirect_uri = WEBAPP_URL + "/api/integrations/googlecalendar/callback";
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      // A refresh token is only returned the first time the user
      // consents to providing access.  For illustration purposes,
      // setting the prompt to 'consent' will force this consent
      // every time, forcing a refresh_token to be returned.
      prompt: "consent",
      state: encodeOAuthState(req),
    });

    res.status(200).json({ url: authUrl });
  }
}
