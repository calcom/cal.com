import type { NextApiRequest } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { getWebexAppKeys } from "../lib/getWebexAppKeys";

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

  const params = {
    response_type: "code",
    client_id,
    redirect_uri: WEBAPP_URL + "/api/integrations/webex/callback",
    scope: [
      "meeting:schedules_read",
      "meeting:schedules_write",
      "meeting:participants_read",
      "meeting:participants_write",
    ],
    state: "",
  };
  const query = stringify(params);
  console.log(query);
  const url = `https://webexapis.com/v1/authorize?${query}`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
