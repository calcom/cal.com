import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaCredentialPatchParams, schemaCredentialPatchBody } from "~/lib/validations/credential-sync";

async function handler(req: NextApiRequest) {
  const { prisma } = req;

  const { userId: reqUserId, credentialId: reqCredentialId } = schemaCredentialPatchParams.parse(req.query);

  const userId = parseInt(reqUserId);
  const credentialId = parseInt(reqCredentialId);

  const { key } = schemaCredentialPatchBody.parse(req.body);

  const credential = await prisma.credential.update({
    where: {
      id: credentialId,
      userId,
    },
    data: {
      key,
    },
    select: {
      id: true,
      appId: true,
    },
  });

  return { credential };
}

export default defaultResponder(handler);
