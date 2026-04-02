import { stringify } from "node:querystring";
import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { getZoomAppKeys } from "../lib";

async function handler(req: NextApiRequest) {
  // Get user
  await prisma.user.findFirstOrThrow({
    where: {
      id: req.session?.user?.id,
    },
    select: {
      id: true,
    },
  });

  const { client_id } = await getZoomAppKeys();
  const state = encodeOAuthState(req);

  const params = {
    response_type: "code",
    client_id,
    redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/zoomvideo/callback`,
    state,
  };
  const query = stringify(params);
  const url = `https://zoom.us/oauth/authorize?${query}`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
