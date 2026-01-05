import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { UserProfile } from "@calcom/types/UserProfile";

export async function checkInstalled(slug: string, userId: number) {
  const alreadyInstalled = await CredentialRepository.findByAppIdAndUserId({ appId: slug, userId });
  if (alreadyInstalled) {
    throw new HttpError({ statusCode: 422, message: "Already installed" });
  }
}

export async function isAppInstalled({ appId, userId }: { appId: string; userId: number }) {
  const alreadyInstalled = await CredentialRepository.findByAppIdAndUserId({ appId, userId });
  return !!alreadyInstalled;
}

type InstallationArgs = {
  appType: string;
  user: {
    id: number;
    profile?: UserProfile;
  };
  slug: string;
  key?: Prisma.InputJsonValue;
  teamId?: number;
  subscriptionId?: string | null;
  paymentStatus?: string | null;
  billingCycleStart?: number | null;
};

export async function createDefaultInstallation({
  appType,
  user,
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
      ...(teamId ? { teamId } : { userId: user.id }),
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
