import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = decodeOAuthState(req);
  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }
  const { code } = req.query;
  const { client_id, client_secret } = await getAppKeysFromSlug("campsite");

  const result = await fetch(`https://auth.campsite.co/oauth/token`, {
    method: "POST",
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id,
      client_secret,
      redirect_uri: `${WEBAPP_URL}/api/integrations/campsite/callback`,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with the Campsite API";
    try {
      const responseBody = await result.json();
      errorMessage = responseBody.error;
    } catch (e) {}

    res.status(400).json({ message: errorMessage });
    return;
  }

  const responseBody = await result.json();
  if (responseBody.error) {
    res.status(400).json({ message: responseBody.error });
    return;
  }

  /**
   * With this we take care of no duplicate Campsite keys for a single user
   * when creating a room using deleteMany if there is already a Campsite key
   * */
  await prisma.credential.deleteMany({
    where: {
      type: "campsite_conferencing",
      userId,
      appId: "campsite",
    },
  });

  await createOAuthAppCredential(
    { appId: "campsite", type: "campsite_conferencing" },
    { access_token: responseBody.access_token },
    req
  );

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "conferencing", slug: "campsite" })
  );
}
