import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { encodeOAuthState } from "../../_utils/encodeOAuthState";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const scopes = ["daily"];

let client_id = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(400).send("Method not allowed");
  }
  const appKeys = await getAppKeysFromSlug("ouraring");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "Oura Ring client id missing." });
  const state = encodeOAuthState(req);
  const params = {
    response_type: "code",
    scope: scopes.join(" "),
    client_id,
    redirect_uri: WEBAPP_URL + "/api/integrations/ouraring/callback",
    state,
  };
  const query = stringify(params);
  const url = `https://cloud.ouraring.com/oauth/authorize?${query}`;
  res.status(200).json({ url });
}
