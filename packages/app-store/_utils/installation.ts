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

type InstallationArgs = {
  appType: string;
  userId: number;
  slug: string;
  key?: Prisma.InputJsonValue;
  teamId?: number;
  subscriptionId?: string | null;
  paymentStatus?: string | null;
  billingCycleStart?: number | null;
};

export async function createDefaultInstallation({
  appType,
  userId,
  slug,
  key = {},
  teamId,
  billingCycleStart,
  paymentStatus,
  subscriptionId,
}: InstallationArgs) {
  const installation = await prisma.credential.create({
    data: {
      type: appType,
      key,
      ...(teamId ? { teamId } : { userId }),
      appId: slug,
      subscriptionId,
      paymentStatus,
      billingCycleStart,
    },
  });
  if (!installation) {
    throw new Error(`Unable to create user credential for type ${appType}`);
  }
  return installation;
}
