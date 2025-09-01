import type { NextApiRequest } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import config from "../config.json";
import { kyzonBaseUrl } from "../lib/axios";
import { getKyzonAppKeys } from "../lib/getKyzonAppKeys";

async function handler(req: NextApiRequest) {
  // Get user
  const user = req?.session?.user;
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const { client_id } = await getKyzonAppKeys();
  const state = encodeOAuthState(req);

  const params = {
    response_type: "code",
    client_id,
    redirect_uri: `${WEBAPP_URL}/api/integrations/${config.slug}/callback`,
    scope: "meetings:write calendar:write profile:read",
    state,
  };
  const query = stringify(params);
  const url = `${kyzonBaseUrl}/oauth/authorize?${query}`;

  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
