import type { NextApiRequest } from "next";
import { stringify } from "node:querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

async function handler(req: NextApiRequest) {
  const state = encodeOAuthState(req);

  const params = {
    response_type: "code",
    redirect_uri: `${WEBAPP_URL}/api/integrations/huddle01video/callback`,
    state,
    appName: "Calcom",
  };
  const query = stringify(params);

  const url = `https://huddle01.app/thirdparty_auth?${query}`;

  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
