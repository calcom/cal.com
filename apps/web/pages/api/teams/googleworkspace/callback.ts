import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

const stateSchema = z.object({
  teamId: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { code, state } = req.query;
  const parsedState = stateSchema.parse(JSON.parse(state as string));
  const { teamId } = parsedState;

  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  const { client_id, client_secret } = await getAppKeysFromSlug("google-calendar");

  if (!client_id || typeof client_id !== "string")
    return res.status(400).json({ message: "Google client_id missing." });
  if (!client_secret || typeof client_secret !== "string")
    return res.status(400).json({ message: "Google client_secret missing." });

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

  if (!teamId) {
    res.redirect(getSafeRedirectUrl(WEBAPP_URL + "/settings") ?? `${WEBAPP_URL}/teams`);
  }

  res.redirect(
    getSafeRedirectUrl(WEBAPP_URL + `/settings/teams/${teamId}/members?inviteModal=true&bulk=true`) ??
      `${WEBAPP_URL}/teams`
  );
}
