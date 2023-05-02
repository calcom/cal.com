import { getAppFromSlug } from "@calcom/app-store/utils";
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
      const appInstalled = await prisma.credential.findFirst({
        where: {
          appId: dependency,
          userId: ctx.user.id,
        },
      });

      const app = await getAppFromSlug(dependency);

      dependencyData.push({ name: app?.name || dependency, slug: dependency, installed: !!appInstalled });
    })
  );

  return dependencyData;
};
