import { getAppFromSlug } from "@calcom/app-store/utils";
import { type InvalidAppCredentialBannerProps } from "@calcom/features/users/components/InvalidAppCredentialsBanner";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

type checkInvalidAppCredentialsOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
};

export const checkInvalidAppCredentials = async ({ ctx }: checkInvalidAppCredentialsOptions) => {
  const userId = ctx.user.id;

  // First get the teams where user is admin/owner
  const userTeamIds = await prisma.membership.findMany({
    where: {
      userId: userId,
      accepted: true,
      role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
    },
    select: {
      teamId: true,
    },
  });

  const apps = await prisma.credential.findMany({
    where: {
      OR: [{ userId }, { teamId: { in: userTeamIds.map((membership) => membership.teamId) } }],
      invalid: true,
    },
    select: {
      appId: true,
    },
  });

  const appNamesAndSlugs: InvalidAppCredentialBannerProps[] = [];
  for (const app of apps) {
    if (app.appId) {
      const appId = app.appId;
      const appMeta = await getAppFromSlug(appId);
      const name = appMeta ? appMeta.name : appId;
      appNamesAndSlugs.push({ slug: appId, name });
    }
  }

  return appNamesAndSlugs;
};
