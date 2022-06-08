import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { encodeOAuthState } from "../../_utils/encodeOAuthState";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { LARK_HOST } from "../common";

let app_id = "";
let app_secret = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const appKeys = await getAppKeysFromSlug("lark-calendar");
    if (typeof appKeys.app_id === "string") app_id = appKeys.app_id;
    if (!app_id) return res.status(400).json({ message: "lark app_id missing." });
    if (typeof appKeys.app_secret === "string") app_secret = appKeys.app_secret;
    if (!app_secret) return res.status(400).json({ message: "lark app_secret missing." });

    const state = encodeOAuthState(req);

    const params = {
      app_id,
      redirect_uri: WEBAPP_URL + "/api/integrations/larkcalendar/callback",
      state,
    };

    const query = stringify(params);

    const url = `https://${LARK_HOST}/open-apis/authen/v1/index?${query}`;

    // trigger app_ticket_immediately
    fetch(`https://${LARK_HOST}/open-apis/auth/v3/app_ticket/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        app_id,
        app_secret,
      }),
    });

    res.status(200).json({ url });
  }
}
