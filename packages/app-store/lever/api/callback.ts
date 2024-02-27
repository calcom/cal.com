import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import config from "../config.json";

export const baseApiUrl = "https://api.lever.co/v1";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const { api_key, user_id } = await getAppKeysFromSlug("lever");
  const redirectUri = encodeURI(`${WEBAPP_URL}/api/integrations/${config.slug}/callback`);
  const authHeader = `Bearer ${Buffer.from(`${api_key}:`).toString("base64")}`;
  const result = await fetch(baseApiUrl, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Host: "api.lever.co",
      "Content-Type": "application/x-www-form-urlencoded",
      perform_as: `${user_id}`,
    },
  });
  if (result.status !== 200) {
    let errorMessage = "Something is wrong with Lever API";
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

  responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
  delete responseBody.expires_in;

  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }
  const existingCredentialLever = await prisma.credential.findMany({
    select: {
      id: true,
    },
    where: {
      type: config.type,
      userId: req.session?.user.id,
      appId: config.slug,
    },
  });

  // Making sure we only delete Greenhouse_video
  const credentialIdsToDelete = existingCredentialLever.map((item) => item.id);
  if (credentialIdsToDelete.length > 0) {
    await prisma.credential.deleteMany({ where: { id: { in: credentialIdsToDelete }, userId } });
  }

  await createOAuthAppCredential({ appId: config.slug, type: config.type }, responseBody, req);

  res.redirect(getInstalledAppPath({ variant: config.variant, slug: config.slug }));
}
