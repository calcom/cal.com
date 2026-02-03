import type { NextApiRequest } from "next";
import { stringify } from "node:querystring";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { LARK_HOST } from "../common";

const larkKeysSchema = z.object({
  app_id: z.string(),
  app_secret: z.string(),
});

async function getHandler(req: NextApiRequest) {
  const appKeys = await getAppKeysFromSlug("lark-calendar");
  const { app_secret, app_id } = larkKeysSchema.parse(appKeys);

  const state = encodeOAuthState(req);

  const params = {
    app_id,
    redirect_uri: `${WEBAPP_URL}/api/integrations/larkcalendar/callback`,
    state,
  };

  const query = stringify(params);

  const url = `https://${LARK_HOST}/open-apis/authen/v1/index?${query}`;

  // trigger app_ticket_immediately
  fetch(`https://${LARK_HOST}/open-apis/auth/v3/app_ticket/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      app_id,
      app_secret,
    }),
  });

  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
