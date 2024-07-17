import { getAppFromSlug } from "@calcom/app-store/utils";
import { type InvalidAppCredentialBannerProps } from "@calcom/features/users/components/InvalidAppCredentialsBanner";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type checkInvalidAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const checkInvalidAppCredentials = async ({ ctx }: checkInvalidAppCredentialsOptions) => {
  const userId = ctx.user.id;

  const apps = await prisma.credential.findMany({
    where: {
      OR: [
        {
          userId: userId,
        },
        {
          team: {
            members: {
              some: {
                userId: userId,
                accepted: true,
                role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
              },
            },
          },
        },
      ],
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
