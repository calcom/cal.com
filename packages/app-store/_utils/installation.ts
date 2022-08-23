import type { Prisma } from "@prisma/client";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

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
}: {
  appType: string;
  userId: number;
  slug: string;
  key?: Prisma.InputJsonValue;
}) {
  const installation = await prisma.credential.create({
    data: {
      type: appType,
      key,
      userId,
      appId: slug,
    },
  });
  if (!installation) {
    throw new Error(`Unable to create user credential for type ${appType}`);
  }
  return installation;
}
