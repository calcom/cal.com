import type { NextApiRequest } from "next";
import { stringify } from "querystring";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

const WEBAPP_URL = "http://localhost:3000";
async function handler(req: NextApiRequest) {
  const state = encodeOAuthState(req);

  const params = {
    response_type: "code",
    redirect_uri: `${WEBAPP_URL}/api/integrations/huddle01video/callback`,
    state,
    appName: "calcom",
  };
  const query = stringify(params);
  const url = `https://darshan.huddle01.app/g_auth?${query}`;

  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
