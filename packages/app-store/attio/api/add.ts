import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

let client_id = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const appKeys = await getAppKeysFromSlug("attio");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "Attio client id missing." });

  const state = encodeOAuthState(req);

  const url = `https://app.attio.com/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(
    `${WEBAPP_URL_FOR_OAUTH}/api/integrations/attio/callback`
  )}&response_type=code${state ? `&state=${state}` : ""}`;

  res.status(200).json({ url });
}
