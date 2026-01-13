import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetAllPaginatedSchema } from "./adminGetAllPaginated.schema";

type AdminGetAllPaginatedOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetAllPaginatedSchema;
};

const adminGetAllPaginatedHandler = async ({ input }: AdminGetAllPaginatedOptions) => {
  const { cursor, limit, searchTerm } = input;

  const getTotalOrgs = await prisma.team.count({
    where: {
      isOrganization: true,
      isPlatform: false,
    },
  });

  let searchFilters: Prisma.TeamWhereInput = {
    isOrganization: true,
    isPlatform: false,
  };

  if (searchTerm) {
    searchFilters = {
      ...searchFilters,
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: searchTerm.toLowerCase(),
          },
        },
        {
          members: {
            some: {
              role: "OWNER",
              user: {
                email: {
                  contains: searchTerm.toLowerCase(),
                },
              },
            },
          },
        },
      ],
    };
  }

  const allOrgs = await prisma.team.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    where: searchFilters,
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      metadata: true,
      organizationSettings: true,
      members: {
        where: {
          role: "OWNER",
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  let nextCursor: typeof cursor | undefined;
  if (allOrgs && allOrgs.length > limit) {
    const nextItem = allOrgs.pop();
    nextCursor = nextItem?.id;
  }

  const parsedOrgs = allOrgs
    .map((org) => {
      const parsed = teamMetadataSchema.safeParse(org.metadata);
      if (!parsed.success) {
        console.error(`Failed to parse metadata for org ${org.id}:`, safeStringify(parsed.error));
        return null;
      }
      return { ...org, metadata: parsed.data };
    })
    .filter((org): org is NonNullable<typeof org> => org !== null);

  return {
    rows: parsedOrgs,
    nextCursor,
    meta: {
      totalRowCount: getTotalOrgs || 0,
    },
  };
};

export default adminGetAllPaginatedHandler;
