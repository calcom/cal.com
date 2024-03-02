import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { extractUserIdsFromQuery } from "~/lib/utils/extractUserIdsFromQuery";
import { schemaCredentialGetParams } from "~/lib/validations/credential-sync";

async function handler(req: NextApiRequest) {
  const { userId: reqUserId, prisma } = req;

  const { appSlug } = schemaCredentialGetParams.parse(req.query);

  const userId = req.query.userId ? extractUserIdsFromQuery(req)[0] : reqUserId;

  const credentials = await prisma.credential.findMany({
    where: {
      userId: userId,
      ...(appSlug && { appId: appSlug }),
    },
  });

  return credentials;
}

export default defaultResponder(handler);
