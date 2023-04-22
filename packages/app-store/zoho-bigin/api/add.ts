import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import config from "../config.json";

const SCOPE = "ZohoBigin.modules.events.ALL,ZohoBigin.modules.contacts.ALL";
const RESPONSE_TYPE = "code";
const ACCESS_TYPE = "offline";
const SLUG = config.slug;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const appKeys = await getAppKeysFromSlug(SLUG);

    const clientId = typeof appKeys.client_id === "string" ? appKeys.client_id : "";
    if (!clientId) return res.status(400).json({ message: "Zoho Bigin client_id missing." });

    const redirectUri = WEBAPP_URL + `/api/integrations/${SLUG}/callback`;
    const authUrl = axios.getUri({
      url: "https://accounts.zoho.com/oauth/v2/auth",
      params: {
        scope: SCOPE,
        client_id: clientId,
        response_type: RESPONSE_TYPE,
        redirect_uri: redirectUri,
        access_type: ACCESS_TYPE,
      },
    });

    res.status(200).json({ url: authUrl });
    return;
  }
  res.status(400).json({ message: "Invalid request method." });
}
