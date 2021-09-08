import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@lib/auth";
import prisma from "../../../../lib/prisma";
import { google } from "googleapis";

const credentials = process.env.GOOGLE_API_CREDENTIALS!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  // Check that user is authenticated
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }
  if (typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  const { client_secret, client_id, redirect_uris } = JSON.parse(credentials).web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = await oAuth2Client.getToken(code);
  const key = token.res?.data;
  await prisma.credential.create({
    data: {
      type: "google_calendar",
      key,
      userId: session.user.id,
    },
  });

  res.redirect("/integrations");
}
