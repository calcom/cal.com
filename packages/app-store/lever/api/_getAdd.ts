import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { client_id, audience } = await getAppKeysFromSlug("lever");

  if (!client_id || typeof client_id !== "string")
    return res.status(400).json({ message: "Lever client_id missing." });

  const state = encodeOAuthState(req) ?? "";

  const params = new URLSearchParams({
    client_id,
    redirect_uri: `${WEBAPP_URL}/api/integrations/lever/callback`,
    response_type: "code",
    scope: "offline_access applications:read:admin candidates:read:admin candidates:write:admin interviews:read:admin interviews:write:admin notes:read:admin notes:write:admin opportunities:read:admin opportunities:write:admin postings:read:admin users:read:admin",
    audience: (audience as string) || "https://api.lever.co/v1/",
    state,
  });

  return res.status(200).json({
    url: `https://auth.lever.co/authorize?${params.toString()}`,
  });
}

export default defaultResponder(handler);
