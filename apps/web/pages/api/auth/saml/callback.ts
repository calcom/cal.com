import { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";

import jackson from "@lib/jackson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const { oauthController } = await jackson();
    const { redirect_url } = await oauthController.samlResponse(req.body);

    res.redirect(302, redirect_url);
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      console.error("callback error:", err);
      const { message, statusCode = 500 } = err;
      return res.status(statusCode).send(message);
    }
    return res.status(500).send("Unknown error");
  }
}
