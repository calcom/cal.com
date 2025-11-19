import type { NextApiRequest } from "next";

import { OAuth2UniversalSchema } from "@calcom/app-store/_utils/oauth/universalSchema";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { schemaCredentialPatchParams, schemaCredentialPatchBody } from "~/lib/validations/credential-sync";

/**
 * @swagger
 * /credential-sync:
 *   patch:
 *     operationId: updateUserAppCredential
 *     summary: Update a credential record for a user
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to fetch the credentials for
 *       - in: query
 *         name: credentialId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the credential to update
 *     tags:
 *     - credentials
 *     requestBody:
 *       description: Update a new credential
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedKey
 *             properties:
 *               encryptedKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       505:
 *        description: Credential syncing not enabled
 */
async function handler(req: NextApiRequest) {
  const { userId, credentialId } = schemaCredentialPatchParams.parse(req.query);

  const { encryptedKey } = schemaCredentialPatchBody.parse(req.body);

  const decryptedKey = JSON.parse(
    symmetricDecrypt(encryptedKey, process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY || "")
  );

  const key = OAuth2UniversalSchema.parse(decryptedKey);

  const credential = await prisma.credential.update({
    where: {
      id: credentialId,
      userId,
    },
    data: {
      key: key as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      appId: true,
    },
  });

  return { credential };
}

export default defaultResponder(handler);
