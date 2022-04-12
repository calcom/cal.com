import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";

const credentials = process.env.GOOGLE_API_CREDENTIALS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }
  if (!credentials) {
    res.status(400).json({ message: "There are no Google Credentials installed." });
    return;
  }

  const { client_secret, client_id } = JSON.parse(credentials).web;
  const redirect_uri = WEBAPP_URL + "/api/integrations/googlecalendar/callback";

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  let key = "";

  if (code) {
    const token = await oAuth2Client.getToken(code);

    key = token.res?.data;
  }

  await prisma.credential.create({
    data: {
      type: "google_calendar",
      key,
      userId: req.session?.user.id,
    },
  });
  const state = decodeOAuthState(req);
  res.redirect(state?.returnTo ?? "/apps/installed");
}
