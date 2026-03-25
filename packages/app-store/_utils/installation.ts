import type { Prisma } from "@prisma/client";

import { HttpError } from "@calcom/lib/http-error";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import prisma from "@calcom/prisma";
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
  calIdTeamId?: number;
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
  calIdTeamId,
  billingCycleStart,
  paymentStatus,
  subscriptionId,
}: InstallationArgs) {
  const appMeta = getAppFromSlug(slug);
  const isOwnerScopedInstallation = appMeta?.owner_scoped_installation === true;

  const installation = await prisma.credential.create({
    data: {
      type: appType,
      key,
      ...(isOwnerScopedInstallation
        ? { userId: user.id }
        : calIdTeamId
        ? { calIdTeamId }
        : teamId
        ? { teamId }
        : { userId: user.id }),
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
