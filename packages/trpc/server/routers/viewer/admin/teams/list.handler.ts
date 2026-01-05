import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../../types";
import type { TListTeamsSchema } from "./list.schema";

type ListTeamsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListTeamsSchema;
};

export const listTeamsHandler = async ({ input }: ListTeamsOptions) => {
  const { cursor, limit, searchTerm, type, subscriptionStatus, hasBillingIssues, dateRange, parentId } =
    input;

  // Build where clause
  const whereConditions: any[] = [];

  // Filter by type
  if (type === "TEAM") {
    whereConditions.push({ isOrganization: false });
  } else if (type === "ORGANIZATION") {
    whereConditions.push({ isOrganization: true });
  }

  // Search by name or slug
  if (searchTerm) {
    whereConditions.push({
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
        {
          slug: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
      ],
    });
  }

  // Filter by parent organization
  if (parentId !== undefined) {
    whereConditions.push({ parentId });
  }

  // Filter by date range
  if (dateRange) {
    whereConditions.push({
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    });
  }

  const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

  // Count total teams matching filter
  const totalCount = await prisma.team.count({ where });

  // Fetch teams with pagination
  const teams = await prisma.team.findMany({
    where,
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // Take one extra to determine if there's a next page
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isOrganization: true,
      createdAt: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
      teamBilling: {
        select: {
          status: true,
          planName: true,
          customerId: true,
          subscriptionId: true,
        },
      },
      organizationBilling: {
        select: {
          status: true,
          planName: true,
          customerId: true,
          subscriptionId: true,
        },
      },
    },
  });

  // Determine next cursor
  let nextCursor: typeof cursor | undefined;
  if (teams.length > limit) {
    const nextItem = teams.pop();
    nextCursor = nextItem?.id;
  }

  // Transform data for response
  const transformedTeams = teams.map((team) => {
    const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;

    return {
      id: team.id,
      name: team.name,
      slug: team.slug || "",
      isOrganization: team.isOrganization,
      createdAt: team.createdAt,
      memberCount: team._count.members,
      parent: team.parent
        ? {
            id: team.parent.id,
            name: team.parent.name,
            slug: team.parent.slug || "",
          }
        : null,
      billing: billing
        ? {
            status: billing.status,
            planName: billing.planName,
            customerId: billing.customerId,
            subscriptionId: billing.subscriptionId,
            hasPendingPayment: billing.status === "past_due" || billing.status === "unpaid",
          }
        : null,
    };
  });

  // Apply post-query filters that require billing data
  let filteredTeams = transformedTeams;

  if (subscriptionStatus && subscriptionStatus.length > 0) {
    filteredTeams = filteredTeams.filter(
      (team) => team.billing && subscriptionStatus.includes(team.billing.status)
    );
  }

  if (hasBillingIssues !== undefined) {
    filteredTeams = filteredTeams.filter((team) => {
      if (!team.billing) return !hasBillingIssues;
      return hasBillingIssues ? team.billing.hasPendingPayment : !team.billing.hasPendingPayment;
    });
  }

  return {
    teams: filteredTeams,
    nextCursor,
    meta: {
      totalCount,
    },
  };
};

export default listTeamsHandler;
