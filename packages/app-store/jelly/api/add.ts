import type { NextApiRequest } from "next";
import { stringify } from "node:querystring";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

const jellyAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getJellyAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("jelly");
  return jellyAppKeysSchema.parse(appKeys);
};

async function handler(req: NextApiRequest) {
  // Get user
  const user = req?.session?.user;
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const { client_id } = await getJellyAppKeys();
  const state = encodeOAuthState(req);

  const params = {
    response_type: "code",
    app_id: client_id,
    redirect_uri: `${WEBAPP_URL}/api/integrations/jelly/callback`,
    state,
    scope: "write:jellies,read:user_email_phone",
  };
  const query = stringify(params);
  const url = `https://jellyjelly.com/login/oauth?${query}`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
