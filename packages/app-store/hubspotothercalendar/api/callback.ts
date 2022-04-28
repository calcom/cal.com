import * as hubspot from "@hubspot/api-client";
import { TokenResponseIF } from "@hubspot/api-client/lib/codegen/oauth/models/TokenResponseIF";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";

const client_id = process.env.HUBSPOT_CLIENT_ID;
const client_secret = process.env.HUBSPOT_CLIENT_SECRET;
const hubspotClient = new hubspot.Client();

export type HubspotToken = TokenResponseIF & {
  expiryDate?: number;
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

  const hubspotToken: HubspotToken = await hubspotClient.oauth.tokensApi.createToken(
    "authorization_code",
    code,
    WEBAPP_URL + "/api/integrations/hubspotothercalendar/callback",
    client_id,
    client_secret
  );

  // set expiry date as offset from current time.
  hubspotToken.expiryDate = Math.round(Date.now() + hubspotToken.expiresIn * 1000);
  await prisma.credential.create({
    data: {
      type: "hubspot_other_calendar",
      key: hubspotToken as any,
      userId: req.session?.user.id,
    },
  });

  const state = decodeOAuthState(req);
  res.redirect(getSafeRedirectUrl(state?.returnTo) ?? "/apps/installed");
}
