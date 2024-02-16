import { getAppFromSlug } from "@calcom/app-store/utils";
import { type InvalidAppCredentialBannerProps } from "@calcom/features/users/components/InvalidAppCredentialsBanner";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type checkInvalidAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const checkInvalidAppCredentials = async ({ ctx }: checkInvalidAppCredentialsOptions) => {
  const apps = await prisma.credential.findMany({
    where: {
      userId: ctx.user.id,
      invalid: true,
    },
    select: {
      app: {
        select: {
          slug: true,
        },
      },
    },
  });

  const appNamesAndSlugs: InvalidAppCredentialBannerProps[] = [];

  for (const e of apps) {
    if (e.app) {
      const slug = e.app.slug;
      const appMeta = await getAppFromSlug(slug);
      const name = appMeta ? appMeta.name : slug;
      appNamesAndSlugs.push({ slug, name });
    }
  }
  return appNamesAndSlugs;
};
