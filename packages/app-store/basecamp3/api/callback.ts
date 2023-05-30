import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("req query", req.query);
  const { code } = req.query;
  const { client_id, client_secret } = await getAppKeysFromSlug("basecamp3");

  const redirectUri = WEBAPP_URL + "/api/integrations/basecamp3/callback";
  const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");
  const result = await fetch(
    `https://launchpad.37signals.com/authorization/token?type=web_server&client_id=${client_id}&redirect_uri=${redirectUri}&client_secret=${client_secret}&code=${code}`,
    {
      method: "POST",
    }
  );

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with the Basecamp 3 API";
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

  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }

  await prisma.user.update({
    where: {
      id: req.session?.user.id,
    },
    data: {
      credentials: {
        create: {
          type: appConfig.type,
          key: responseBody,
          appId: appConfig.slug,
        },
      },
    },
  });

  res.redirect(getInstalledAppPath({ variant: "other", slug: "basecamp3" }));
}
