import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

const credentials = process.env.GOOGLE_API_CREDENTIALS;
const BASE_URL = process.env.BASE_URL;
const scopes = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({});
  } else {
    // Get token from Google Calendar API
    const reqQuery = stringify(req.query);
    const { client_secret, client_id } = JSON.parse(credentials).web;
    const redirect_uri = BASE_URL + "/api/amili/integration/googlecalendar/callback";
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      // A refresh token is only returned the first time the user
      // consents to providing access.  For illustration purposes,
      // setting the prompt to 'consent' will force this consent
      // every time, forcing a refresh_token to be returned.
      prompt: "consent", //select_account
      state: reqQuery,
    });

    res.status(200).json({ url: authUrl });
  }
}
