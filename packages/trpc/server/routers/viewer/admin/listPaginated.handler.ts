import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TListMembersSchema } from "./listPaginated.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersSchema;
};

export const listMembersHandler = async ({ ctx, input }: GetOptions) => {
  const { cursor, limit } = input;

  const getTotalUsers = await prisma.user.count();

  const users = await prisma.user.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    orderBy: {
      id: "asc",
    },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (users && users.length > limit) {
    const nextItem = users.pop();
    nextCursor = nextItem!.id;
  }

  return {
    rows: users || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalUsers || 0,
    },
  };
};
