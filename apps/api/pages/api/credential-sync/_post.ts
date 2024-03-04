import type { NextApiRequest } from "next";

import { minimumTokenResponseSchema } from "@calcom/app-store/_utils/oauth/parseRefreshTokenResponse";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaCredentialPostParams, schemaCredentialPostBody } from "~/lib/validations/credential-sync";

async function handler(req: NextApiRequest) {
  const { prisma } = req;

  const { userId: reqUserId } = schemaCredentialPostParams.parse(req.query);

  const { appSlug, encryptedKey } = schemaCredentialPostBody.parse(req.body);

  const decryptedKey = JSON.parse(
    symmetricDecrypt(encryptedKey, process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY)
  );

  const key = minimumTokenResponseSchema.parse(decryptedKey);

  const userId = parseInt(reqUserId);

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
