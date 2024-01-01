import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";

const appCredentialWebhookRequestBodySchema = z.object({
  // UserId of the cal.com user
  userId: z.number().int(),
  appSlug: z.string(),
  // Keys should be AES256 encrypted with the CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY
  keys: z.string(),
});
/** */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!APP_CREDENTIAL_SHARING_ENABLED) {
    return res.status(403).json({ message: "Credential sharing is not enabled" });
  }

  if (
    req.headers[process.env.CALCOM_WEBHOOK_HEADER_NAME || "calcom-webhook-secret"] !==
    process.env.CALCOM_WEBHOOK_SECRET
  ) {
    return res.status(403).json({ message: "Invalid webhook secret" });
  }

  const reqBody = appCredentialWebhookRequestBodySchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: reqBody.userId } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const app = await prisma.app.findUnique({
    where: { slug: reqBody.appSlug },
    select: { dirName: true },
  });

  if (!app) {
    return res.status(404).json({ message: "App not found" });
  }

  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];

  if (!appMetadata) {
    return res.status(404).json({ message: "App not found. Ensure that you have the correct app slug" });
  }

  const keys = JSON.parse(
    symmetricDecrypt(reqBody.keys, process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY || "")
  );

  // INFO: Can't use prisma upsert as we don't know the id of the credential
  const appCredential = await prisma.credential.findFirst({
    where: {
      userId: reqBody.userId,
      appId: appMetadata.slug,
    },
    select: {
      id: true,
    },
  });

  if (appCredential) {
    await prisma.credential.update({
      where: {
        id: appCredential.id,
      },
      data: {
        key: keys,
      },
    });
    return res.status(200).json({ message: `Credentials updated for userId: ${reqBody.userId}` });
  } else {
    await prisma.credential.create({
      data: {
        key: keys,
        userId: reqBody.userId,
        appId: appMetadata.slug,
        type: appMetadata.type,
      },
    });
    return res.status(200).json({ message: `Credentials created for userId: ${reqBody.userId}` });
  }
}
