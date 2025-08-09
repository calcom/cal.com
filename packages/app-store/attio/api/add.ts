import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { appKeysSchema } from "../zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { client_id } = await getParsedAppKeysFromSlug("attio", appKeysSchema);
  if (!client_id) return res.status(400).json({ message: "Attio client id missing." });

  const state = encodeOAuthState(req);

  const url = new URL("https://app.attio.com/authorize");
  url.searchParams.append("client_id", client_id);
  url.searchParams.append("redirect_uri", `${WEBAPP_URL_FOR_OAUTH}/api/integrations/attio/callback`);
  url.searchParams.append("response_type", "code");
  if (state) {
    url.searchParams.append("state", state);
  }

  res.status(200).json({ url: url.toString() });
}
