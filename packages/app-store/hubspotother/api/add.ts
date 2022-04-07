import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";

const scopes = ["crm.objects.contacts.read", "crm.objects.contacts.write"];

const client_id = process.env.HUBSPOT_CLIENT_ID;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!client_id) {
    res.status(400).json({ message: "HubSpot client id missing." });
    return;
  }

  if (req.method === "GET") {
    const params = {
      client_id: client_id,
      redirect_uri: WEBAPP_URL + "/api/integrations/hubspotother/callback",
      scope: scopes.join(" "),
    };
    const query = stringify(params);
    const url = `https://app.hubspot.com/oauth/authorize?${query}`;
    console.log({ url });
    res.status(200).json({ url });
  }
}
