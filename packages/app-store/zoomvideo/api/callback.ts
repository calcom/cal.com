import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { getZoomAppKeys } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const { client_id, client_secret } = await getZoomAppKeys();

  const redirectUri = encodeURI(WEBAPP_URL + "/api/integrations/zoomvideo/callback");
  const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");
  const result = await fetch(
    "https://zoom.us/oauth/token?grant_type=authorization_code&code=" + code + "&redirect_uri=" + redirectUri,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
    }
  );

  const responseBody = await result.json();

  responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
  delete responseBody.expires_in;

  await prisma.user.update({
    where: {
      id: req.session?.user.id,
    },
    data: {
      credentials: {
        create: {
          type: "zoom_video",
          key: responseBody,
        },
      },
    },
  });

  res.redirect("/apps/installed");
}
