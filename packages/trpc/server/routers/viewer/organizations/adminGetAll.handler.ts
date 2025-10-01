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
  const { limit, offset, searchTerm, filters = [] } = input;

  // Extract filters
  const reviewedFilter = filters.find((filter) => filter.id === "reviewed") as
    | TypedColumnFilter<ColumnFilterType.SINGLE_SELECT>
    | undefined;
  const dnsConfiguredFilter = filters.find((filter) => filter.id === "dnsConfigured") as
    | TypedColumnFilter<ColumnFilterType.SINGLE_SELECT>
    | undefined;
  const publishedFilter = filters.find((filter) => filter.id === "published") as
    | TypedColumnFilter<ColumnFilterType.SINGLE_SELECT>
    | undefined;
  const adminApiFilter = filters.find((filter) => filter.id === "adminApi") as
    | TypedColumnFilter<ColumnFilterType.SINGLE_SELECT>
    | undefined;

  // Build where clause
  const whereClause: Prisma.TeamWhereInput = {
    isOrganization: true,
    ...(searchTerm && {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { slug: { contains: searchTerm, mode: "insensitive" } },
      ],
    }),
    ...(reviewedFilter && {
      organizationSettings: {
        ...makeWhereClause({
          columnName: "isAdminReviewed",
          filterValue: reviewedFilter.value,
        }),
      },
    }),
    ...(dnsConfiguredFilter && {
      organizationSettings: {
        ...makeWhereClause({
          columnName: "isOrganizationConfigured",
          filterValue: dnsConfiguredFilter.value,
        }),
      },
    }),
    ...(adminApiFilter && {
      organizationSettings: {
        ...makeWhereClause({
          columnName: "isAdminAPIEnabled",
          filterValue: adminApiFilter.value,
        }),
      },
    }),
  };

  // Apply published filter (slug is null or not null)
  if (publishedFilter) {
    if (
      publishedFilter.value.type === ColumnFilterType.SINGLE_SELECT &&
      typeof publishedFilter.value.data === "string"
    ) {
      if (publishedFilter.value.data === "true") {
        whereClause.slug = { not: null };
      } else if (publishedFilter.value.data === "false") {
        whereClause.slug = null;
      }
    }
  }

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
