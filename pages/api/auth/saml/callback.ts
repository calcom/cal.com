import { NextApiRequest, NextApiResponse } from "next";

import jackson from "../../../../lib/jackson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("callback:", req.query, req.body);

    const { oauthController } = await jackson();
    const { redirect_url } = await oauthController.samlResponse(req.body);

    res.redirect(redirect_url);
  } catch (err: any) {
    console.error("callback error:", err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
