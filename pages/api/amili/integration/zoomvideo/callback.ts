import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  const { code, info } = req.query;
  // console.log("\n ==> req.query =", req.query);
  const [assUserId, coachId, isCoachUser] = info.toString().split("*");

  const redirectUri = encodeURI(process.env.BASE_URL + "/api/amili/integration/zoomvideo/callback");
  const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");

  const result = await fetch(
    "https://zoom.us/oauth/token?grant_type=authorization_code&code=" + code + "&redirect_uri=" + redirectUri,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
    }
  ).then((res) => res.json());

  await prisma.credential.create({
    data: {
      type: "zoom_video",
      key: result,
      userId: +assUserId,
    },
  });

  const redirectURL =
    isCoachUser === "true"
      ? `${process.env.AMILI_BASE_URL}/dashboard/settings/coach-profile`
      : `${process.env.AMILI_BASE_URL}/dashboard/coach-system/users/${coachId}`;

  return res.redirect(redirectURL);
}
