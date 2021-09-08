import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@lib/auth";
import prisma from "../../../../lib/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  // Check that user is authenticated
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  const redirectUri = encodeURI(process.env.BASE_URL + "/api/integrations/zoomvideo/callback");
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
  const json = await result.json();

  await prisma.credential.create({
    data: {
      type: "zoom_video",
      key: json,
      userId: session.user.id,
    },
  });
  res.redirect("/integrations");
}
