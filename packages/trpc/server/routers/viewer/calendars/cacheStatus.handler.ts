import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type CacheStatusOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: any;
  };
  input: {
    credentialIds: number[];
  };
};

export const cacheStatusHandler = async ({ ctx, input }: CacheStatusOptions) => {
  const cacheEntries = await ctx.prisma.calendarCache.findMany({
    where: {
      credentialId: { in: input.credentialIds },
      expiresAt: { gte: new Date() },
    },
    select: {
      credentialId: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const cacheStatus = cacheEntries.reduce((acc: Record<number, Date>, entry: any) => {
    if (!acc[entry.credentialId] || entry.updatedAt > acc[entry.credentialId]) {
      acc[entry.credentialId] = entry.updatedAt;
    }
    return acc;
  }, {} as Record<number, Date>);

  return cacheStatus;
};
