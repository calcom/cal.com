import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import config from "../config.json";
import { getGreenhouseAppKeys } from "../lib/getGreenhouseAppKeys";

export const baseApiUrl = "https://harvest.greenhouse.io/v1";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const { api_key } = await getGreenhouseAppKeys();

  /** @link https://developers.greenhouse.io/harvest.html#authentication **/

  const redirectUri = encodeURI(`${WEBAPP_URL}/api/integrations/${config.slug}/callback`);
  const authHeader = "Basic " + Buffer.from(api_key + ":").toString("base64");
  const result = await fetch(baseApiUrl, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Host: "harvest.greenhouse.io",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with Greenhouse API";
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
  /**
   * With this we take care of no duplicate Greenhouse key for a single user
   * when creating a video room we only do findFirst so the if they have more than 1
   * others get ignored
   * */
  const existingCredentialGreenhouseVideo = await prisma.credential.findMany({
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
  const credentialIdsToDelete = existingCredentialGreenhouseVideo.map((item) => item.id);
  if (credentialIdsToDelete.length > 0) {
    await prisma.credential.deleteMany({ where: { id: { in: credentialIdsToDelete }, userId } });
  }

  await createOAuthAppCredential({ appId: config.slug, type: config.type }, responseBody, req);

  res.redirect(getInstalledAppPath({ variant: config.variant, slug: config.slug }));
}
