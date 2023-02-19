import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";

import { HttpError } from "@lib/core/http/error";

// This is the callback endpoint for the OIDC provider
// A team must set this endpoint in the OIDC provider's configuration
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(400).send("Method not allowed");
  }

  const { code, state } = req.query as {
    code: string;
    state: string;
  };

  const { oauthController } = await jackson();

  try {
    const { redirect_url } = await oauthController.oidcAuthzResponse({ code, state });

    if (!redirect_url) {
      throw new HttpError({
        message: "No redirect URL found",
        statusCode: 500,
      });
    }

    return res.redirect(302, redirect_url);
  } catch (err) {
    const { message, statusCode = 500 } = err as HttpError;

    return res.status(statusCode).send(message);
  }
}
