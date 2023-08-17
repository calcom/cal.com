import type { NextApiRequest, NextApiResponse } from "next";
import stringify from "qs-stringify";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { getSlackAppKeys } from "../lib/getSlackAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { client_id } = await getSlackAppKeys();

    const redirect_uri = encodeURI(WEBAPP_URL + "/api/integrations/slack/callback");
    const slackConnectParams = {
      client_id,
      scope: "incoming-webhook",
      redirect_uri,
      state: typeof req.query.state === "string" ? req.query.state : undefined,
    };
    /** stringify is being dumb here */
    const params = z.record(z.any()).parse(slackConnectParams);
    const query = stringify(params);

    const url = `https://slack.com/oauth/v2/authorize?${query}`;

    res.status(200).json({ url });
  }
}
