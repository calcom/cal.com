import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import qs from "qs";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

let client_id = "";
let client_secret = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (code === undefined && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const appKeys = await getAppKeysFromSlug("zohocrm");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (!client_id) return res.status(400).json({ message: "Zoho Crm consumer key missing." });
  if (!client_secret) return res.status(400).json({ message: "Zoho Crm consumer secret missing." });

  const url = `${req.query["accounts-server"]}/oauth/v2/token`;
  const redirectUri = `${WEBAPP_URL}/api/integrations/zohocrm/callback`;
  const formData = {
    grant_type: "authorization_code",
    client_id: client_id,
    client_secret: client_secret,
    redirect_uri: redirectUri,
    code: code,
  };
  const zohoCrmTokenInfo = await axios({
    method: "post",
    url: url,
    data: qs.stringify(formData),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });
  // set expiry date as offset from current time.
  zohoCrmTokenInfo.data.expiryDate = Math.round(Date.now() + 60 * 60);
  zohoCrmTokenInfo.data.accountServer = req.query["accounts-server"];

  await createOAuthAppCredential(
    { appId: "zohocrm", type: "zohocrm_other_calendar" },
    zohoCrmTokenInfo.data,
    req
  );

  const state = decodeOAuthState(req);
  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "zohocrm" })
  );
}
