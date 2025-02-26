import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaCredentialDeleteParams } from "~/lib/validations/credential-sync";

/**
 * @swagger
 * /credential-sync:
 *   delete:
 *     operationId: deleteUserAppCredential
 *     summary: Delete a credential record for a user
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
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       505:
 *        description: Credential syncing not enabled
 */
async function handler(req: NextApiRequest) {
  const { userId, credentialId } = schemaCredentialDeleteParams.parse(req.query);

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
