import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const appKeys = await getAppKeysFromSlug(appConfig.slug);

    const clientId = typeof appKeys.client_id === "string" ? appKeys.client_id : "";
    if (!clientId) return res.status(400).json({ message: "Zoho Bigin client_id missing." });

    const redirectUri = WEBAPP_URL + `/api/integrations/${appConfig.slug}/callback`;
    const authUrl = axios.getUri({
      url: "https://accounts.zoho.com/oauth/v2/auth",
      params: {
        scope: appConfig.scope,
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        access_type: "offline",
      },
    });

    res.status(200).json({ url: authUrl });
    return;
  }
  res.status(400).json({ message: "Invalid request method." });
}
