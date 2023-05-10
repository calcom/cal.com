import type { PrismaClient } from "@prisma/client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TSearchInputSchema } from "./search.schema";

type SearchHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TSearchInputSchema;
};

export async function searchHandler({ input, ctx }: SearchHandlerOptions) {
  const { cursor, limit: limit_, teamId } = input;
  const limit = limit_ ?? 10;

  const items = await ctx.prisma.membership.findMany({
    take: limit + 1,
    select: {
      accepted: true,
      role: true,
      disableImpersonation: true,
      user: {
        select: {
          username: true,
          email: true,
          name: true,
          id: true,
          bio: true,
        },
      },
    },
    where: { teamId },
    cursor: cursor
      ? {
          userId_teamId: {
            teamId: cursor.teamId,
            userId: cursor.userId,
          },
        }
      : undefined,
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = {
      teamId: nextItem!.teamId,
      userId: nextItem!.userId,
    };
  }

  const members = items?.map((obj) => {
    return {
      ...obj.user,
      role: obj.role,
      accepted: obj.accepted,
      disableImpersonation: obj.disableImpersonation,
      avatar: `${WEBAPP_URL}/${obj.user.username}/avatar.png`,
    };
  });

  return { members, nextCursor };
}
