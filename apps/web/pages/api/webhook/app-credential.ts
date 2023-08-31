import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const appCredentialWebhookRequestBodySchema = z.object({
  // UserId of the cal.com user
  userId: z.number().int(),
  //   The dirname of the app under packages/app-store
  appDirName: z.string(),
  keys: z.record(z.any()),
});
/** */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check that credential sharing is enabled
  if (!APP_CREDENTIAL_SHARING_ENABLED) {
    return res.status(403).json({ message: "Credential sharing is not enabled" });
  }

  // Check that the webhook secret matches
  if (req.headers["calcom-webhook-secret"] !== process.env.CALCOM_WEBHOOK_SECRET) {
    return res.status(403).json({ message: "Invalid webhook secret" });
  }

  const reqBody = appCredentialWebhookRequestBodySchema.parse(req.body);

  // Check that the user exists
  const user = await prisma.user.findUnique({ where: { id: reqBody.userId } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  //   Search for the app's slug and type
  const appMetadata = appStoreMetadata[reqBody.appDirName as keyof typeof appStoreMetadata];

  if (!appMetadata) {
    return res.status(404).json({ message: "App not found. Ensure that you have the correct appDir" });
  }

  // Can't use prisma upsert as we don't know the id of the credential
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
        key: reqBody.keys,
      },
    });
    return res.status(200).json({ message: `Credentials updated for userId: ${reqBody.userId}` });
  } else {
    await prisma.credential.create({
      data: {
        key: reqBody.keys,
        userId: reqBody.userId,
        appId: appMetadata.slug,
        type: appMetadata.type,
      },
    });
    return res.status(200).json({ message: `Credentials created for userId: ${reqBody.userId}` });
  }
}
