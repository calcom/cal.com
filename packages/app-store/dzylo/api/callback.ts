import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import qs from "qs";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { WEBAPP_URL } from "@calcom/lib/constants";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

const BASE_URL = `https://cal-webhook.dzylo.com/api`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const {code} = req.query;
    let clientId = "";
    let clientSecret = "";
    const appKeys = await getAppKeysFromSlug("dzylo");
    if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
    if (!clientId) return res.status(400).json({ message: "Dzylo Crm consumer key missing." });
    if (!clientSecret) return res.status(400).json({ message: "Dzylo Crm consumer secret missing." });
    if (code === undefined && typeof code !== "string") {
      res.status(400).json({ message: "`code` must be a string" });
      return;
    }
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "You must be logged in to do this" });
    }
  
    const url = `${BASE_URL}/oauth/debug_token`;
    const formData = {
        code: code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${WEBAPP_URL}/api/integrations/dzylo/callback`  
      };
    const dzyloTokenInfo = await axios({
      method: "post",
      url: url,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      data: qs.stringify(formData),
    });
  
    await createOAuthAppCredential({ appId: appConfig.slug, type: appConfig.type }, dzyloTokenInfo.data, req);
  
    const state = decodeOAuthState(req);
  
    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "crm", slug: "dzylo" })
    );
  }
