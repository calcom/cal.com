import { getAppFromSlug } from "@calcom/app-store/utils";
import { getAllDwdCredentialsForUserByAppSlug } from "@calcom/lib/domainWideDelegation/server";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TQueryForDependenciesInputSchema } from "./queryForDependencies.schema";

type QueryForDependenciesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TQueryForDependenciesInputSchema;
};

export const queryForDependenciesHandler = async ({ ctx, input }: QueryForDependenciesOptions) => {
  if (!input) return;

  const dependencyData: { name: string; slug: string; installed: boolean }[] = [];

  await Promise.all(
    input.map(async (dependency) => {
      const appId = dependency;
      const dbCredential = await prisma.credential.findFirst({
        where: {
          appId,
          userId: ctx.user.id,
        },
      });

      const dwdCredentials = await getAllDwdCredentialsForUserByAppSlug({
        user: ctx.user,
        appSlug: appId,
      });
      const appInstalled = !!dbCredential || !!dwdCredentials.length;

      const app = getAppFromSlug(dependency);

      dependencyData.push({ name: app?.name || dependency, slug: dependency, installed: !!appInstalled });
    })
  );

  return dependencyData;
};
