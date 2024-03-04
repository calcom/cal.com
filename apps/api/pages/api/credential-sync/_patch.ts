import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaCredentialPatchParams, schemaCredentialPatchBody } from "~/lib/validations/credential-sync";

async function handler(req: NextApiRequest) {
  const { prisma } = req;

  const { userId: reqUserId, credentialId: reqCredentialId } = schemaCredentialPatchParams.parse(req.query);

  const userId = parseInt(reqUserId);
  const credentialId = parseInt(reqCredentialId);

  const { encryptedKey } = schemaCredentialPatchBody.parse(req.body);

  const decryptedKey = JSON.parse(
    symmetricDecrypt(encryptedKey, process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY)
  );

  const key = minimumTokenResponseSchema.parse(decryptedKey);

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
