import { makeWhereClause } from "@calcom/features/data-table/lib/server";
import { type TypedColumnFilter, ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetAllSchema } from "./adminGetAll.schema";

type AdminGetAllOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetAllSchema;
};

export const adminGetUnverifiedHandler = async ({ input }: AdminGetAllOptions) => {
  const { limit, offset, searchTerm } = input;

  // Build where clause
  const whereClause: Prisma.TeamWhereInput = {
    isOrganization: true,
    ...(searchTerm && {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { slug: { contains: searchTerm, mode: "insensitive" } },
      ],
    }),
  };

  // Get total count
  const totalCount = await prisma.team.count({
    where: whereClause,
  });

  // Get paginated data
  const allOrgs = await prisma.team.findMany({
    where: whereClause,
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
    take: limit,
    skip: offset,
    orderBy: {
      createdAt: "desc",
    },
  });

  const rows = allOrgs
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
    rows,
    meta: {
      totalRowCount: totalCount,
    },
  };
};

export default adminGetUnverifiedHandler;
