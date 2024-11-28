import type { NextApiRequest } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { getWebexAppKeys } from "../lib/getWebexAppKeys";
import { metadata } from "../metadata.generated";

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

  const { client_id } = await getWebexAppKeys();

  /** @link https://developer.webex.com/docs/integrations#requesting-permission */
  const params = {
    response_type: "code",
    client_id,
    redirect_uri: `${WEBAPP_URL}/api/integrations/${metadata.slug}/callback`,
    scope: "spark:kms meeting:schedules_read meeting:schedules_write", //should be "A space-separated list of scopes being requested by your integration"
    state: "",
  };
  const query = stringify(params).replaceAll("+", "%20");
  const url = `https://webexapis.com/v1/authorize?${query}`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
