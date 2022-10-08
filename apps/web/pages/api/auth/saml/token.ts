import { NextApiRequest, NextApiResponse } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";

import { HttpError } from "@lib/core/http/error";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { oauthController } = await jackson();

  if (req.method !== "POST") {
    return res.status(400).send("Method not allowed");
  }

  try {
    const result = await oauthController.token(req.body);

    return res.json(result);
  } catch (err) {
    const { message, statusCode = 500 } = err as HttpError;

    return res.status(statusCode).send(message);
  }
}
