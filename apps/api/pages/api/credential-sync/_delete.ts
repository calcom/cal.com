import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaCredentialDeleteParams } from "~/lib/validations/credential-sync";

async function handler(req: NextApiRequest) {
  const { prisma } = req;

  const { userId: reqUserId, credentialId: reqCredentialId } = schemaCredentialDeleteParams.parse(req.query);

  const userId = parseInt(reqUserId);
  const credentialId = parseInt(reqCredentialId);

  const credential = await prisma.credential.delete({
    where: {
      id: credentialId,
      userId,
    },
    select: {
      id: true,
      appId: true,
    },
  });

  return { credentialDeleted: credential };
}

export default defaultResponder(handler);
