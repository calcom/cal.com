import type { Prisma } from "@prisma/client";

import { whereClauseForOrgWithSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";

import type { TeamSelect, TeamFilter } from "../data/team";

export function mapToPrismaSelect(select: TeamSelect): Prisma.TeamSelect {
  return select as Prisma.TeamSelect;
}

export function mapToPrismaWhere(filter: TeamFilter): Prisma.TeamWhereInput {
  const where: Prisma.TeamWhereInput = {};

  if (filter.id !== undefined) {
    where.id = filter.id;
  }

  if (filter.slug !== undefined) {
    where.slug = filter.slug;
  }

  if (filter.parentId !== undefined) {
    where.parentId = filter.parentId;
  }

  if (filter.parentSlug !== undefined) {
    where.parent = filter.parentSlug ? whereClauseForOrgWithSlugOrRequestedSlug(filter.parentSlug) : null;
  }

  if (filter.isOrganization !== undefined) {
    where.isOrganization = filter.isOrganization;
  }

  if (filter.havingMemberWithId !== undefined) {
    where.members = { some: { userId: filter.havingMemberWithId } };
  }

  return where;
}
