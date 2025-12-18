import { makeOrderBy, makeWhereClause } from "@calcom/features/data-table/lib/server";
import { ColumnFilterType, type FilterValue } from "@calcom/features/data-table/lib/types";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminListTeamsSchema } from "./listTeams.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminListTeamsSchema;
};

type TeamListRow = {
  id: number;
  name: string;
  slug: string | null;
  isOrganization: boolean;
  organization: { id: number; name: string; slug: string | null } | null;
  owner: { id: number; name: string | null; email: string; username: string | null } | null;
  subscriptionId: string | null;
  createdAt: Date;
};

function getFilter(filters: NonNullable<TAdminListTeamsSchema["filters"]>, id: string) {
  return filters.find((f) => f.id === id);
}

function asTextFilterValue(value: FilterValue): FilterValue {
  // We only support TEXT filtering for some columns, but keep runtime guardrails:
  if (value.type !== ColumnFilterType.TEXT) {
    throw new Error(`Invalid filter type for text filter: ${value.type}`);
  }
  return value;
}

export default async function listTeamsHandler({ input }: GetOptions) {
  const { limit, offset, searchTerm } = input;
  const filters = input.filters ?? [];
  const orderBy = makeOrderBy(input.sorting ?? []);

  const where: Prisma.TeamWhereInput = {};

  // Global search
  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { slug: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Column filters
  const idFilter = getFilter(filters, "id");
  if (idFilter) {
    Object.assign(where, makeWhereClause({ columnName: "id", filterValue: idFilter.value }));
  }

  const slugFilter = getFilter(filters, "slug");
  if (slugFilter) {
    Object.assign(where, makeWhereClause({ columnName: "slug", filterValue: slugFilter.value }));
  }

  const nameFilter = getFilter(filters, "name");
  if (nameFilter) {
    Object.assign(where, makeWhereClause({ columnName: "name", filterValue: nameFilter.value }));
  }

  const organizationFilter = getFilter(filters, "organization");
  if (organizationFilter) {
    where.parent = makeWhereClause({ columnName: "name", filterValue: organizationFilter.value });
  }

  const ownerFilter = getFilter(filters, "owner");
  if (ownerFilter) {
    const filterValue = asTextFilterValue(ownerFilter.value);
    where.members = {
      some: {
        role: MembershipRole.OWNER,
        accepted: true,
        user: {
          OR: [
            makeWhereClause({ columnName: "email", filterValue }),
            makeWhereClause({ columnName: "username", filterValue }),
            makeWhereClause({ columnName: "name", filterValue }),
          ],
        },
      },
    };
  }

  const subscriptionIdFilter = getFilter(filters, "subscriptionId");
  if (subscriptionIdFilter) {
    where.OR = [
      ...(where.OR ?? []),
      {
        teamBilling: {
          is: makeWhereClause({
            columnName: "subscriptionId",
            filterValue: subscriptionIdFilter.value,
          }),
        },
      },
      {
        organizationBilling: {
          is: makeWhereClause({
            columnName: "subscriptionId",
            filterValue: subscriptionIdFilter.value,
          }),
        },
      },
    ];
  }

  const kindFilter = getFilter(filters, "kind");
  if (kindFilter && kindFilter.value.type === ColumnFilterType.MULTI_SELECT) {
    const values = kindFilter.value.data.map(String);
    const includesOrg = values.includes("organization");
    const includesTeam = values.includes("team");
    if (includesOrg !== includesTeam) {
      Object.assign(where, { isOrganization: includesOrg });
    }
  }

  const [totalRowCount, teams] = await Promise.all([
    prisma.team.count({ where }),
    prisma.team.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        isOrganization: true,
        createdAt: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        teamBilling: {
          select: {
            subscriptionId: true,
          },
        },
        organizationBilling: {
          select: {
            subscriptionId: true,
          },
        },
        members: {
          where: {
            role: MembershipRole.OWNER,
            accepted: true,
          },
          take: 1,
          orderBy: {
            createdAt: "asc",
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: orderBy ?? [{ id: "asc" }],
    }),
  ]);

  const rows: TeamListRow[] = teams.map((team) => {
    const owner = team.members[0]?.user ?? null;
    return {
      id: team.id,
      name: team.name,
      slug: team.slug ?? null,
      isOrganization: team.isOrganization,
      organization: team.parent
        ? { id: team.parent.id, name: team.parent.name, slug: team.parent.slug ?? null }
        : null,
      owner: owner
        ? { id: owner.id, name: owner.name ?? null, email: owner.email, username: owner.username ?? null }
        : null,
      subscriptionId: team.teamBilling?.subscriptionId ?? team.organizationBilling?.subscriptionId ?? null,
      createdAt: team.createdAt,
    };
  });

  return {
    rows,
    meta: {
      totalRowCount,
    },
  };
}

