import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../trpc";
import type { TListMembersSchema } from "./listPaginated.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersSchema;
};

const listPaginatedHandler = async ({ input }: GetOptions) => {
  const { cursor, limit, searchTerm } = input;

  const getTotalUsers = await prisma.user.count();

  let searchFilters: Prisma.UserWhereInput = {};

  if (searchTerm) {
    searchFilters = {
      OR: [
        {
          email: {
            contains: searchTerm.toLowerCase(),
          },
        },
        {
          username: {
            contains: searchTerm.toLocaleLowerCase(),
          },
        },
      ],
    };
  }

  const users = await prisma.user.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    where: searchFilters,
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      locked: true,
      email: true,
      username: true,
      name: true,
      timeZone: true,
      role: true,
      organizationId: true,
    },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (users && users.length > limit) {
    const nextItem = users.pop();
    nextCursor = nextItem?.id;
  }

  return {
    rows: users || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalUsers || 0,
    },
  };
};

export default listPaginatedHandler;
