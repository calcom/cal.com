import type { NextApiRequest } from "next";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

async function handler(req: NextApiRequest) {
  await prisma.user.findFirstOrThrow({
    where: {
      id: req.session?.user?.id,
    },
    select: {
      id: true,
    },
  });

  const { client_id } = await getAppKeysFromSlug("slack");
  if (!client_id) throw new Error("Slack client_id missing.");

  const url = `https://slack.com/oauth/v2/authorize?client_id=${client_id}&redirect_uri=${WEBAPP_URL}/api/integrations/slack/callback`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
