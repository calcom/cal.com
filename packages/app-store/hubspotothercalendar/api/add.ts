import * as hubspot from "@hubspot/api-client";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

const scopes = ["crm.objects.contacts.read", "crm.objects.contacts.write"];

const client_id = process.env.HUBSPOT_CLIENT_ID;
const hubspotClient = new hubspot.Client();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!client_id) {
    res.status(400).json({ message: "HubSpot client id missing." });
    return;
  }

  if (req.method === "GET") {
    const redirectUri = WEBAPP_URL + "/api/integrations/hubspotothercalendar/callback";
    const url = hubspotClient.oauth.getAuthorizationUrl(client_id, redirectUri, scopes.join(" "));
    res.status(200).json({ url });
  }
}
