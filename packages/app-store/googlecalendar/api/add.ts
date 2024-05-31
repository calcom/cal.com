import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { SCOPES } from "../lib/constants";
import { getGoogleAppKeys } from "../lib/getGoogleAppKeys";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  // Get token from Google Calendar API
  const { client_id, client_secret } = await getGoogleAppKeys();
  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlecalendar/callback`;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    // A refresh token is only returned the first time the user
    // consents to providing access.  For illustration purposes,
    // setting the prompt to 'consent' will force this consent
    // every time, forcing a refresh_token to be returned.
    prompt: "consent",
    state: encodeOAuthState(req),
  });

  res.status(200).json({ url: authUrl });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
