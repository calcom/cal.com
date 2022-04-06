import { OAuthReqBody } from "@boxyhq/saml-jackson";
import { NextApiRequest, NextApiResponse } from "next";

import jackson from "@lib/jackson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      throw new Error("Method not allowed");
    }

    const { oauthController } = await jackson();
    const { redirect_url } = await oauthController.authorize(req.query as unknown as OAuthReqBody);
    res.redirect(302, redirect_url);
  } catch (err: any) {
    console.error("authorize error:", err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
