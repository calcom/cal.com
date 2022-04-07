import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { handleErrorsJson } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";

const client_id = process.env.HUBSPOT_CLIENT_ID;
const client_secret = process.env.HUBSPOT_CLIENT_SECRET;

export type HubSpotTokenReturnType = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  created_date: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  if (!client_id) {
    res.status(400).json({ message: "HubSpot client id missing." });
    return;
  }

  if (!client_secret) {
    res.status(400).json({ message: "HubSpot client secret missing." });
    return;
  }

  // Generates grant_type=authorization_code&client_id=XXXX-XXXX-XXXX-XX&...
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: client_id,
    client_secret: client_secret,
    redirect_uri: WEBAPP_URL + "/api/integrations/hubspotother/callback",
    code,
  }).toString();

  console.log({ body });

  const response = await fetch(`https://api.hubspot.com/oauth/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });
  debugger;
  const hubSpotTokenReturn: HubSpotTokenReturnType = await handleErrorsJson(response);
  hubSpotTokenReturn.created_date = Date.now();

  await prisma.credential.create({
    data: {
      type: "hubspot_other",
      key: hubSpotTokenReturn,
      userId: req.session?.user.id,
    },
  });

  const state = decodeOAuthState(req);
  res.redirect(state?.returnTo ?? "/apps/installed");
}
