import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { getSession } from "@calcom/lib/auth";
import { BASE_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { encodeOAuthState } from "../utils";

const scopes = ["OnlineMeetings.ReadWrite"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Check that user is authenticated
    const session = await getSession({ req });

    if (!session?.user) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const state = encodeOAuthState(req);

    const params = {
      response_type: "code",
      scope: scopes.join(" "),
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      redirect_uri: BASE_URL + "/api/integrations/office365video/callback",
      state,
    };
    const query = stringify(params);
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;
    res.status(200).json({ url });
  }
}
