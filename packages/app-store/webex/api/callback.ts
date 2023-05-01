import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import config from "../config.json";
import { getWebexAppKeys } from "../lib/getWebexAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const { client_id, client_secret } = await getWebexAppKeys();

  /** @link https://developer.webex.com/docs/integrations#getting-an-access-token **/

  const redirectUri = encodeURI(`${WEBAPP_URL}/api/integrations/${config.slug}/callback`);
  const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");
  const result = await fetch(
    "https://webexapis.com/v1/access_token?grant_type=authorization_code&client_id" +
      client_id +
      "&client_secret=" +
      client_secret +
      "&code=" +
      code +
      "&redirect_uri=" +
      redirectUri,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with Webex API";
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
   * With this we take care of no duplicate webex key for a single user
   * when creating a video room we only do findFirst so the if they have more than 1
   * others get ignored
   * */
  const existingCredentialWebexVideo = await prisma.credential.findMany({
    select: {
      id: true,
    },
    where: {
      type: config.type,
      userId: req.session?.user.id,
      appId: config.slug,
    },
  });

  // Making sure we only delete webex_video
  const credentialIdsToDelete = existingCredentialWebexVideo.map((item) => item.id);
  if (credentialIdsToDelete.length > 0) {
    await prisma.credential.deleteMany({ where: { id: { in: credentialIdsToDelete }, userId } });
  }

  await prisma.user.update({
    where: {
      id: req.session?.user.id,
    },
    data: {
      credentials: {
        create: {
          type: config.type,
          key: responseBody,
          appId: config.slug,
        },
      },
    },
  });

  res.redirect(getInstalledAppPath({ variant: config.variant, slug: config.slug }));
}
