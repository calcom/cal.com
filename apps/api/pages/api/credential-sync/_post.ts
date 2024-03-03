import type { NextApiRequest } from "next";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { extractUserIdsFromQuery } from "~/lib/utils/extractUserIdsFromQuery";
import { schemaCredentialPostParams } from "~/lib/validations/credential-sync";

async function handler(req: NextApiRequest) {
  const { userId: reqUserId, prisma } = req;

  const { appSlug, key } = schemaCredentialPostParams.parse(req.query);

  const userId = req.query.userId ? extractUserIdsFromQuery(req)[0] : reqUserId;

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
