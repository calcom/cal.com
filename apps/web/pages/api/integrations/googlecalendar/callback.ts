import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { BASE_URL } from "@lib/config/constants";
import prisma from "@lib/prisma";

import { decodeOAuthState } from "../utils";

const credentials = process.env.GOOGLE_API_CREDENTIALS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  // Check that user is authenticated
  const session = await getSession({ req: req });

  if (!session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }
  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }
  if (!credentials) {
    res.status(400).json({ message: "There are no Google Credentials installed." });
    return;
  }

  const { client_secret, client_id } = JSON.parse(credentials).web;
  const redirect_uri = BASE_URL + "/api/integrations/googlecalendar/callback";

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
      userId: session.user.id,
    },
  });
  const state = decodeOAuthState(req);
  res.redirect(state?.returnTo ?? "/integrations");
}
