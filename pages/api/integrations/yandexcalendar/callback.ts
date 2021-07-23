import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import prisma from "../../../../lib/prisma";
import { SCOPES } from "./constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<unknown> {
  const { code } = req.query;

  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  const toUrlEncoded = (payload) =>
    Object.keys(payload)
      .map((key) => key + "=" + encodeURIComponent(payload[key]))
      .join("&");
  const hostname =
    "x-forwarded-host" in req.headers
      ? "https://" + req.headers["x-forwarded-host"]
      : "host" in req.headers
      ? (req.secure ? "https://" : "http://") + req.headers["host"]
      : "";

  const body = toUrlEncoded({
    client_id: process.env.YANDEX_OAUTH_ID,
    client_secret: process.env.YANDEX_OAUTH_SECRET,
    grant_type: "authorization_code",
    code,
    scope: SCOPES.join(" "),
    redirect_uri: hostname + "/api/integrations/yandexcalendar/callback",
  });

  const response = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  const responseBody = await response.json();

  if (!response.ok) {
    return res.redirect("/integrations?error=" + JSON.stringify(responseBody));
  }

  responseBody.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in);
  delete responseBody.expires_in;

  await prisma.credential.create({
    data: {
      type: "yandex_calendar",
      key: responseBody,
      userId: session.user.id,
    },
  });

  return res.redirect("/integrations");
}
