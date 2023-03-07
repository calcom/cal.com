import * as hubspot from "@hubspot/api-client";
import type { TokenResponseIF } from "@hubspot/api-client/lib/codegen/oauth/models/TokenResponseIF";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";

let client_id = "";
let client_secret = "";
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

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const appKeys = await getAppKeysFromSlug("hubspot");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (!client_id) return res.status(400).json({ message: "HubSpot client id missing." });
  if (!client_secret) return res.status(400).json({ message: "HubSpot client secret missing." });

  const hubspotToken: HubspotToken = await hubspotClient.oauth.tokensApi.createToken(
    "authorization_code",
    code,
    WEBAPP_URL + "/api/integrations/hubspot/callback",
    client_id,
    client_secret
  );

  // set expiry date as offset from current time.
  hubspotToken.expiryDate = Math.round(Date.now() + hubspotToken.expiresIn * 1000);
  await prisma.credential.create({
    data: {
      type: "hubspot_other_calendar",
      key: hubspotToken as any,
      userId: req.session.user.id,
      appId: "hubspot",
    },
  });

  const state = decodeOAuthState(req);
  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "hubspot" })
  );
}
