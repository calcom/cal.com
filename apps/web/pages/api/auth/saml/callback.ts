import { NextApiRequest, NextApiResponse } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { oauthController } = await jackson();

  if (req.method !== "POST") {
    return res.status(400).send("Method not allowed");
  }

  try {
    const { redirect_url } = await oauthController.samlResponse(req.body);

    if (redirect_url) {
      return res.redirect(302, redirect_url);
    }
  } catch (err: any) {
    const { message, statusCode = 500 } = err;

    return res.status(statusCode).send(message);
  }
}
