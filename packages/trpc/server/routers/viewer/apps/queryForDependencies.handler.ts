import { getAllDelegationCredentialsForUserByAppSlug } from "@calcom/app-store/delegationCredential";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
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

      const delegationCredentials = await getAllDelegationCredentialsForUserByAppSlug({
        user: ctx.user,
        appSlug: appId,
      });
      const appInstalled = !!dbCredential || !!delegationCredentials.length;

      const app = getAppFromSlug(dependency);

      dependencyData.push({ name: app?.name || dependency, slug: dependency, installed: !!appInstalled });
    })
  );

  return dependencyData;
};
