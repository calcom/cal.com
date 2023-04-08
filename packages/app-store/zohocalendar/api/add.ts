import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { encodeOAuthState } from "../../_utils/encodeOAuthState";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const zohoKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const appKeys = await getAppKeysFromSlug("zoho-calendar");
    const { client_id } = zohoKeysSchema.parse(appKeys);

    const state = encodeOAuthState(req);

    const params = {
      client_id,
      response_type: "code",
      redirect_uri: WEBAPP_URL + "/api/integrations/zohocalendar/callback",
      scope: ["ZohoCalendar.calendar.ALL", "ZohoCalendar.event.ALL", "ZohoCalendar.freebusy.READ"],
      access_type: "offline",
      state,
      prompt: "consent",
    };

    const query = stringify(params);

    res.status(200).json({ url: `https://accounts.zoho.com/oauth/v2/auth?${query}` });
  }
}
