import { stringify } from "node:querystring";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { getBasecampKeys } from "../lib/getBasecampKeys";

async function handler(req: NextApiRequest) {
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  await prisma.user.findFirstOrThrow({
    where: {
      id: req.session.user.id,
    },
    select: {
      id: true,
    },
  });

  const { client_id } = await getBasecampKeys();
  const state = encodeOAuthState(req);

  const params: Record<string, string> = {
    type: "web_server",
    client_id,
  };
  if (state) {
    params.state = state;
  }
  const query = stringify(params);
  const url = `https://launchpad.37signals.com/authorization/new?${query}&redirect_uri=${WEBAPP_URL}/api/integrations/basecamp3/callback`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
