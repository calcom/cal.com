import z from "zod";

import { getAppFromSlug } from "@calcom/app-store/utils";

import type { TRPCEndpointOptions } from "../../../trpc";

const inputSchema = z.string().array().optional();
export const queryForDependencies = async ({ ctx, input }: TRPCEndpointOptions<typeof inputSchema>) => {
  if (!input) return;

  const dependencyData: { name: string; slug: string; installed: boolean }[] = [];

  await Promise.all(
    input.map(async (dependency) => {
      const appInstalled = await ctx.prisma.credential.findFirst({
        where: {
          appId: dependency,
          userId: ctx.user?.id,
        },
      });
      const app = await getAppFromSlug(dependency);

      dependencyData.push({ name: app?.name || dependency, slug: dependency, installed: !!appInstalled });
    })
  );

  return dependencyData;
};
