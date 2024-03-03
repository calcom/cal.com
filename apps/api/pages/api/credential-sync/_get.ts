import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaCredentialGetParams } from "~/lib/validations/credential-sync";

async function handler(req: NextApiRequest) {
  const { prisma } = req;

  const { appSlug, userId: reqUserId } = schemaCredentialGetParams.parse(req.query);

  const userId = parseInt(reqUserId);

  let credentials = await prisma.credential.findMany({
    where: {
      userId,
      ...(appSlug && { appId: appSlug }),
    },
    select: {
      id: true,
      appId: true,
    },
  });

  //   For apps we're transitioning to using the term slug to keep things consistent
  credentials = credentials.map((credential) => {
    return {
      ...credential,
      appSlug: credential.appId,
    };
  });

  return { credentials };
}

export default defaultResponder(handler);
