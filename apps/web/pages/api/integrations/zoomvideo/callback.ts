import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { BASE_URL } from "@lib/config/constants";

import prisma from "../../../../lib/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  // Check that user is authenticated
  const session = await getSession({ req });

  if (!session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  const redirectUri = encodeURI(BASE_URL + "/api/integrations/zoomvideo/callback");
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
      id: session.user.id,
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

  res.redirect("/integrations");
}
