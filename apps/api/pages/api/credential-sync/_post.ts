import type { NextApiRequest } from "next";

import { minimumTokenResponseSchema } from "@calcom/app-store/_utils/oauth/parseRefreshTokenResponse";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaCredentialPostParams, schemaCredentialPostBody } from "~/lib/validations/credential-sync";

/**
 * @swagger
 * /credential-sync:
 *   post:
 *     operationId: createUserAppCredential
 *     summary: Create a credential record for a user
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
 *     requestBody:
 *       description: Create a new credential
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedKey
 *               - appSlug
 *             properties:
 *               encryptedKey:
 *                 type: string
 *               appSlug:
 *                type: string
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       505:
 *        description: Credential syncing not enabled
 */
async function handler(req: NextApiRequest) {
  const { prisma } = req;

  if (!req.body) {
    throw new HttpError({ message: "Request body is missing", statusCode: 400 });
  }

  const { userId } = schemaCredentialPostParams.parse(req.query);

  const { appSlug, encryptedKey } = schemaCredentialPostBody.parse(req.body);

  const decryptedKey = JSON.parse(
    symmetricDecrypt(encryptedKey, process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY || "")
  );

  const key = minimumTokenResponseSchema.parse(decryptedKey);

  // Need to get app type
  const app = await prisma.app.findUnique({
    where: { slug: appSlug },
    select: { dirName: true },
  });

  if (!app) {
    throw new HttpError({ message: "App not found", statusCode: 500 });
  }

  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];

  const credential = await prisma.credential.create({
    data: {
      userId,
      appId: appSlug,
      key,
      type: appMetadata.type,
    },
    select: {
      id: true,
      appId: true,
    },
  });

  return { credential };
}

export default defaultResponder(handler);
