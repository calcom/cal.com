import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";

const scopes = ["crm.objects.contacts"];

const client_id = process.env.HUBSPOT_CLIENT_ID;
const client_secret = process.env.HUBSPOT_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!client_id || !client_secret) {
    res.status(400).json({ message: "There are no HubSpot keys installed." });
    return;
  }

  const redirect_uri = WEBAPP_URL + "/api/integrations/hubspotother/callback";

  // Example authorization URL
  // https://app.hubspot.com/oauth/authorize?
  //     client_id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&scope=contacts%20automation&redirect_uri=https://www.example.com/

  // Example redirect URL
  // https://www.example.com/?code=xxxx
}
