import type { Prisma } from "@prisma/client";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "./getAppKeysFromSlug";

export async function checkInstalled(slug: string, userId: number) {
  const alreadyInstalled = await prisma.credential.findFirst({
    where: {
      appId: slug,
      userId: userId,
    },
  });
  if (alreadyInstalled) {
    throw new HttpError({ statusCode: 422, message: "Already installed" });
  }
}

export async function createDefaultInstallation({
  appType,
  userId,
  slug,
  key = {},
  teamId,
  useAppKeys,
  keysCustomFunc,
}: {
  appType: string;
  userId: number;
  slug: string;
  key?: Prisma.InputJsonValue;
  teamId?: number;
  useAppKeys?: boolean;
  keysCustomFunc?: (arg0: Prisma.JsonObject) => string;
}) {
  const appKeys = await getAppKeysFromSlug(slug);
  const installation = await prisma.credential.create({
    data: {
      type: appType,
      key: useAppKeys && keysCustomFunc ? keysCustomFunc(appKeys) : key,
      ...(teamId ? { teamId } : { userId }),
      appId: slug,
    },
  });
  if (!installation) {
    throw new Error(`Unable to create user credential for type ${appType}`);
  }
  return installation;
}
