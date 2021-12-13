import { NextApiRequest, NextApiResponse } from "next";

import jackson from "@lib/jackson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { oauthController } = await jackson();
    const result = await oauthController.token(req.body);

    res.json(result);
  } catch (err: any) {
    console.error("token error:", err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
