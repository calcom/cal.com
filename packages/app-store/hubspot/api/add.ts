import { Client } from "@hubspot/api-client";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

const scopes = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.schemas.companies.read",
  "crm.objects.companies.read",
];

let client_id = "";
const oauth = new Client().oauth;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const appKeys = await getAppKeysFromSlug("hubspot");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "HubSpot client id missing." });

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/hubspot/callback`;
  const url = oauth.getAuthorizationUrl(
    client_id,
    redirectUri,
    scopes.join(" "),
    undefined,
    encodeOAuthState(req)
  );
  res.status(200).json({ url });
}
