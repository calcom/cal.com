import { NextApiRequest, NextApiResponse } from "next";

import jackson from "../../../../lib/jackson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("authorize:", req.query);
    const { oauthController } = await jackson();
    const { redirect_url } = await oauthController.authorize(req.query);
    res.redirect(redirect_url);
  } catch (err: any) {
    console.error("authorize error:", err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
