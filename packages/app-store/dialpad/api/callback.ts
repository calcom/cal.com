import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import config from "../config.json";
import { getDialpadAppKeys } from "../lib/getDialpadAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const { client_id, client_secret } = await getDialpadAppKeys();

  const result = await fetch("https://dialpad.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      client_id,
      client_secret,
    }),
  });

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with Dialpad API";
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
  const existingCredentialDialpadVideo = await prisma.credential.findMany({
    select: {
      id: true,
    },
    where: {
      type: config.type,
      userId: req.session?.user.id,
      appId: config.slug,
    },
  });

  const credentialIdsToDelete = existingCredentialDialpadVideo.map((item) => item.id);
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
