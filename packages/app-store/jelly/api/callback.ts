import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }
  const { code } = req.query;
  const { client_id, client_secret } = await getAppKeysFromSlug("jelly");

  const result = await fetch(`https://www.jellyjelly.com/login/oauth/access_token`, {
    method: "POST",
    body: JSON.stringify({ code, client_id, client_secret }),
  });

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with the Jelly API";
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
   * With this we take care of no duplicate jelly key for a single user
   * when creating a room using deleteMany if there is already a jelly key
   * */
  await prisma.credential.deleteMany({
    where: {
      type: "jelly_conferencing",
      userId,
      appId: "jelly",
    },
  });

  await createOAuthAppCredential(
    { appId: "jelly", type: "jelly_conferencing" },
    { access_token: responseBody.access_token },
    req
  );

  res.redirect(getInstalledAppPath({ variant: "conferencing", slug: "jelly" }));
}
