import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { WEBAPP_URL } from "@calcom/lib/constants";

const scopes = ["https://www.googleapis.com/auth/admin.directory.user.readonly"];

let client_id = "";
let client_secret = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get appKeys from google-calendar
    const appKeys = await getAppKeysFromSlug("google-calendar");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
    if (!client_id) return res.status(400).json({ message: "Google client_id missing." });
    if (!client_secret) return res.status(400).json({ message: "Google client_secret missing." });

    // use differnt callback to normal calendar connection
    const redirect_uri = WEBAPP_URL + "/api/teams/googleworkspace/callback";
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,

      prompt: "consent",
      state: JSON.stringify({ teamId: req.query.teamId }),
    });

    res.status(200).json({ url: authUrl });
  }
}
