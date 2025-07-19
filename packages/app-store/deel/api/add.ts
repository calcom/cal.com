import type { NextApiRequest, NextApiResponse } from "next";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { deelAuthUrl } from "../lib/constants";
import { appKeysSchema } from "../zod";

const scopes = ["time-off:write", "time-off:read", "people:read"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { client_id, redirect_uris } = await getParsedAppKeysFromSlug("deel", appKeysSchema);
  if (!client_id) return res.status(400).json({ message: "Deel client id missing." });
  if (!redirect_uris) return res.status(400).json({ message: "Deel redirect uri missing." });

  const state = encodeOAuthState(req);

  const authUrl = new URL(`${deelAuthUrl}/oauth2/authorize`);
  authUrl.searchParams.set("client_id", client_id);
  authUrl.searchParams.set("redirect_uri", redirect_uris);
  // testing,
  // authUrl.searchParams.set("redirect_uri", "https://a309c11eafec.ngrok-free.app/api/integrations/deel/callback");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  if (state) {
    authUrl.searchParams.set("state", state);
  }

  console.log("auth url: ", authUrl.toString());
  res.status(200).json({ url: authUrl.toString() });
}
