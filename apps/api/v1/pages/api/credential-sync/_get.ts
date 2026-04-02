import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { schemaCredentialGetParams } from "~/lib/validations/credential-sync";

/**
 * @swagger
 * /credential-sync:
 *   get:
 *     operationId: getUserAppCredentials
 *     summary: Get all app credentials for a user
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
  const { appSlug, userId } = schemaCredentialGetParams.parse(req.query);

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
