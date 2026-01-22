import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TImpersonationAuditLogSchema } from "./impersonationAuditLog.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TImpersonationAuditLogSchema;
};

const impersonationAuditLogHandler = async ({ input }: GetOptions) => {
  const { cursor, limit, searchTerm } = input;

  const getTotalCount = await prisma.impersonations.count();

  let searchFilters: Prisma.ImpersonationsWhereInput = {};

  if (searchTerm) {
    searchFilters = {
      OR: [
        {
          impersonatedUser: {
            email: {
              contains: searchTerm.toLowerCase(),
            },
          },
        },
        {
          impersonatedUser: {
            username: {
              contains: searchTerm.toLowerCase(),
            },
          },
        },
        {
          impersonatedUser: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          impersonatedBy: {
            email: {
              contains: searchTerm.toLowerCase(),
            },
          },
        },
        {
          impersonatedBy: {
            username: {
              contains: searchTerm.toLowerCase(),
            },
          },
        },
        {
          impersonatedBy: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      ],
    };
  }

  const impersonations = await prisma.impersonations.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    where: searchFilters,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      impersonatedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      },
      impersonatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  let nextCursor: typeof cursor | undefined;
  if (impersonations && impersonations.length > limit) {
    const nextItem = impersonations.pop();
    nextCursor = nextItem?.id;
  }

  return {
    rows: impersonations || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalCount || 0,
    },
  };
};

export default impersonationAuditLogHandler;
