import type { NextApiRequest } from "next";
import { stringify } from "querystring";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

const campsiteAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getCampsiteAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("campsite");
  return campsiteAppKeysSchema.parse(appKeys);
};

async function handler(req: NextApiRequest) {
  // Get user
  const user = req?.session?.user;
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const { client_id } = await getCampsiteAppKeys();
  const state = encodeOAuthState(req);

  const params = {
    response_type: "code",
    client_id,
    redirect_uri: `${WEBAPP_URL}/api/integrations/campsite/callback`,
    state,
    scope: "read_user write_call_room",
  };
  const query = stringify(params);
  const url = `https://auth.campsite.co/oauth/authorize?${query}`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
