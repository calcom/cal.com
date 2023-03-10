import type { OAuthReq } from "@boxyhq/saml-jackson";
import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";

import type { HttpError } from "@lib/core/http/error";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { oauthController } = await jackson();

  if (req.method !== "GET") {
    return res.status(400).send("Method not allowed");
  }

  try {
    const { redirect_url } = await oauthController.authorize(req.query as unknown as OAuthReq);

    return res.redirect(302, redirect_url as string);
  } catch (err) {
    const { message, statusCode = 500 } = err as HttpError;

    return res.status(statusCode).send(message);
  }
}
