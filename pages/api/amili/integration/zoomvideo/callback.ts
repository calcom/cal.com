import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  const { code, info } = req.query;
  console.log("\n ==> req.query =", req.query);
  const [assUserId, coachId, isCoachUser, isSetupPage] = info.toString().split("*");

  const redirectUri = encodeURI(
    `${process.env.BASE_URL}/api/amili/integration/zoomvideo/callback?info=${assUserId}*${coachId}*${isCoachUser}*${isSetupPage}`
  );

  const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");
  // const authHeader = `Bearer ${process.env.ZOOM_JWT_TOKEN}`;

  const result = await fetch(
    "https://zoom.us/oauth/token?grant_type=authorization_code&code=" + code + "&redirect_uri=" + redirectUri,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        // "User-Agent": "Zoom-Jwt-Request",
        // "content-type": "application/json",
      },
    }
  ).then((res) => res.json());

  const isEnabledUsingOneCredential =
    process.env.ENABLE_ONE_CREDENTIAL && process.env.ENABLE_ONE_CREDENTIAL.toLowerCase() === "true";

  const lastResult = { ...result };

  if (isEnabledUsingOneCredential) {
    const previousCredential = await prisma.credential.findFirst();

    if (previousCredential && previousCredential.key) {
      const { key } = previousCredential;

      Object.assign(lastResult, { ...(<Prisma.JsonObject>key) });
    }
  }

  await prisma.credential.create({
    data: {
      type: "zoom_video",
      key: result,
      userId: +assUserId,
    },
  });

  let redirectURL = "";
  if (isCoachUser === "true") {
    redirectURL =
      isSetupPage === "true"
        ? `${process.env.COACH_DASHBOARD_URL}/app/setup-account/success`
        : `${process.env.COACH_DASHBOARD_URL}/app/profile`;
  } else {
    redirectURL = `${process.env.AMILI_BASE_URL}/dashboard/coach-system/users/${coachId}`;
  }
  return res.redirect(redirectURL);
}
