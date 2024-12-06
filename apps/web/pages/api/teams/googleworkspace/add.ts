import { OAuth2Client } from "googleapis-common";
import type { NextApiRequest, NextApiResponse } from "next";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { WEBAPP_URL } from "@calcom/lib/constants";

const scopes = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.customer.readonly",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get appKeys from google-calendar
    const { client_id, client_secret } = await getAppKeysFromSlug("google-calendar");
    if (!client_id || typeof client_id !== "string")
      return res.status(400).json({ message: "Google client_id missing." });
    if (!client_secret || typeof client_secret !== "string")
      return res.status(400).json({ message: "Google client_secret missing." });

    // use differnt callback to normal calendar connection
    const redirect_uri = `${WEBAPP_URL}/api/teams/googleworkspace/callback`;
    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,

      prompt: "consent",
      state: JSON.stringify({ teamId: req.query.teamId }),
    });

    res.status(200).json({ url: authUrl });
  }
}
