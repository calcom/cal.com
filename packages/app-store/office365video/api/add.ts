import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { BASE_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const scopes = ["OnlineMeetings.ReadWrite"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const params = {
      response_type: "code",
      scope: scopes.join(" "),
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      redirect_uri: BASE_URL + "/api/integrations/office365teams/callback",
      // state,
    };
    const query = stringify(params);
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;
    res.status(200).json({ url });
  }
}
