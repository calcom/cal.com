import type { Prisma } from "@prisma/client";

import { getAppFromSlug } from "@calcom/app-store/utils";
import { type InvalidAppCredentialBannerProps } from "@calcom/features/users/components/InvalidAppCredentialsBanner";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type checkInvalidAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

type AppType = Prisma.CredentialGetPayload<{
  select: {
    id: true;
    appId: true;
  };
}>;

export const checkInvalidAppCredentials = async ({ ctx }: checkInvalidAppCredentialsOptions) => {
  const userId = ctx.user.id;

  const apps = await prisma.$queryRaw<AppType[]>`
    SELECT "Credential"."id", "Credential"."appId"
    FROM "Credential"
    WHERE "Credential"."userId" = ${userId} AND "Credential"."invalid" = true
    UNION
    SELECT "Credential"."id", "Credential"."appId"
    FROM "Credential"
    INNER JOIN "Team" AS "t" ON "t"."id" = "Credential"."teamId"
    INNER JOIN "Membership" AS "m" ON "m"."teamId" = "t"."id"
    WHERE "m"."userId" = ${userId} AND "m"."accepted" = true AND "m"."role" IN
          (CAST('ADMIN'::text AS "MembershipRole"),CAST('OWNER'::text AS "MembershipRole"))
          AND "m"."teamId" IS NOT NULL AND "t"."id" IS NOT NULL
      AND "Credential"."invalid" = true`;

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
