import { makeWhereClause } from "@calcom/features/data-table/lib/server";
import { type TypedColumnFilter, ColumnFilterType } from "@calcom/features/data-table/lib/types";
import type { FilterType } from "@calcom/types/data-table";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TListMembersSchema } from "./listMembers.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersSchema;
};

const isAllString = (array: (string | number)[]): array is string[] => {
  return array.every((value) => typeof value === "string");
};
function getUserConditions(oAuthClientId?: string) {
  if (oAuthClientId) {
    return {
      platformOAuthClients: {
        some: { id: oAuthClientId },
      },
      isPlatformManaged: true,
    };
  }
  return { isPlatformManaged: false };
}

export const listMembersHandler = async ({ ctx, input }: GetOptions) => {
  const organizationId = ctx.user.organizationId ?? ctx.user.profiles[0].organizationId;
  const searchTerm = input.searchTerm;
  const oAuthClientId = input.oAuthClientId;
  const expand = input.expand;
  const filters = input.filters || [];

  const featuresRepository = new FeaturesRepository(prisma);
  const pbacFeatureEnabled = await featuresRepository.checkIfTeamHasFeature(organizationId, "pbac");

  const allAttributeOptions = await prisma.attributeOption.findMany({
    where: {
      attribute: {
        teamId: organizationId,
      },
    },
    orderBy: {
      attribute: {
        name: "asc",
      },
    },
  });

  const groupOptionsWithContainsOptionValues = allAttributeOptions
    .filter((option) => option.isGroup)
    .map((option) => ({
      ...option,
      contains: option.contains.map((optionId) => ({
        id: optionId,
        value: allAttributeOptions.find((o) => o.id === optionId)?.value,
      })),
    }));

  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User is not part of any organization." });
  }

  // Get user's membership role in the organization
  const membership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: organizationId,
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not a member of this organization." });
  }

  const permissionCheckService = new PermissionCheckService();

  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: organizationId,
    permission: ctx.user.organization.isPrivate
      ? "organization.listMembersPrivate"
      : "organization.listMembers",
    fallbackRoles: ctx.user.organization.isPrivate
      ? [MembershipRole.ADMIN, MembershipRole.OWNER]
      : [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermission) {
    return {
      canUserGetMembers: false,
      rows: [],
      meta: {
        totalRowCount: 0,
      },
    };
  }
  const { limit, offset } = input;

  const roleFilter = filters.find((filter) => filter.id === "role") as
    | TypedColumnFilter<Extract<FilterType, "ms">>
    | undefined;
  const teamFilter = filters.find((filter) => filter.id === "teams") as
    | TypedColumnFilter<Extract<FilterType, "ms">>
    | undefined;
  const lastActiveAtFilter = filters.find((filter) => filter.id === "lastActiveAt") as
    | TypedColumnFilter<Extract<FilterType, "dr">>
    | undefined;
  const createdAtFilter = filters.find((filter) => filter.id === "createdAt") as
    | TypedColumnFilter<Extract<FilterType, "dr">>
    | undefined;
  const updatedAtFilter = filters.find((filter) => filter.id === "updatedAt") as
    | TypedColumnFilter<Extract<FilterType, "dr">>
    | undefined;

  const roleWhereClause = roleFilter
    ? pbacFeatureEnabled
      ? makeWhereClause({
          columnName: "customRoleId",
          filterValue: roleFilter.value,
        })
      : makeWhereClause({
          columnName: "role",
          filterValue: roleFilter.value,
        })
    : undefined;

  const whereClause: Prisma.MembershipWhereInput = {
    user: {
      ...getUserConditions(oAuthClientId),
      ...(teamFilter && {
        teams: {
          some: {
            team: makeWhereClause({
              columnName: "name",
              filterValue: teamFilter.value,
            }),
          },
        },
      }),
      ...(lastActiveAtFilter &&
        makeWhereClause({
          columnName: "lastActiveAt",
          filterValue: lastActiveAtFilter.value,
        })),
    },
    teamId: organizationId,
    ...(searchTerm && {
      user: {
        OR: [
          { email: { contains: searchTerm, mode: "insensitive" } },
          { username: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
    }),
    ...(roleFilter && roleWhereClause),
    ...(createdAtFilter &&
      makeWhereClause({
        columnName: "createdAt",
        filterValue: createdAtFilter.value,
      })),
    ...(updatedAtFilter &&
      makeWhereClause({
        columnName: "updatedAt",
        filterValue: updatedAtFilter.value,
      })),
  };

  const attributeFilters: Prisma.MembershipWhereInput["AttributeToUser"][] = filters
    .filter(
      (filter) =>
        filter.id !== "role" &&
        filter.id !== "teams" &&
        filter.id !== "lastActiveAt" &&
        filter.id !== "createdAt" &&
        filter.id !== "updatedAt"
    )
    .map((filter) => {
      if (filter.value.type === ColumnFilterType.MULTI_SELECT && isAllString(filter.value.data)) {
        const attributeOptionValues: string[] = [];
        filter.value.data.forEach((filterValueItem) => {
          attributeOptionValues.push(filterValueItem);
          groupOptionsWithContainsOptionValues.forEach((groupOption) => {
            if (groupOption.contains.find(({ value: containValue }) => containValue === filterValueItem)) {
              attributeOptionValues.push(groupOption.value);
            }
          });
        });

        filter.value.data = attributeOptionValues;
      }

      return {
        some: {
          attributeOption: {
            attribute: {
              id: filter.id,
            },
            ...makeWhereClause({
              columnName: "value",
              filterValue: filter.value,
            }),
          },
        },
      };
    });

  // If we have attribute filters, add them to the where clause with AND
  if (attributeFilters.length > 0) {
    whereClause.AND = attributeFilters.map((filter) => ({
      AttributeToUser: filter,
    }));
  }

  const totalCountPromise = prisma.membership.count({
    where: whereClause,
  });

  const teamMembersPromise = prisma.membership.findMany({
    where: whereClause,
    select: {
      id: true,
      role: true,
      accepted: true,
      createdAt: true,
      updatedAt: true,
      customRole: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          profiles: {
            select: {
              organizationId: true,
              username: true,
            },
          },
          email: true,
          avatarUrl: true,
          timeZone: true,
          disableImpersonation: true,
          completedOnboarding: true,
          lastActiveAt: true,
          ...(ctx.user.organization.isOrgAdmin && { twoFactorEnabled: true }),
          teams: {
            select: {
              team: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
    skip: offset,
    take: limit,
    orderBy: {
      id: "asc",
    },
  });

  const [totalCount, teamMembers] = await Promise.all([totalCountPromise, teamMembersPromise]);

  const members = await Promise.all(
    teamMembers?.map(async (membership) => {
      const user = await new UserRepository(prisma).enrichUserWithItsProfile({ user: membership.user });
      let attributes:
        | Array<{
            id: string;
            value: string;
            slug: string;
            attributeId: string;
            weight: number;
            isGroup: boolean;
            contains: string[];
          }>
        | undefined;

      if (expand?.includes("attributes")) {
        attributes = await prisma.attributeToUser
          .findMany({
            where: {
              memberId: membership.id,
            },
            select: {
              attributeOption: true,
              weight: true,
            },
            orderBy: {
              attributeOption: {
                attribute: {
                  name: "asc",
                },
              },
            },
          })
          .then((assignedUsers) =>
            assignedUsers.map((au) => ({
              ...au.attributeOption,
              weight: au.weight ?? 100,
            }))
          );
      }

      return {
        id: user.id,
        username: user.profiles[0]?.username || user.username,
        name: user.name,
        email: user.email,
        timeZone: user.timeZone,
        role: membership.role,
        customRole: membership.customRole,
        accepted: membership.accepted,
        disableImpersonation: user.disableImpersonation,
        completedOnboarding: user.completedOnboarding,
        lastActiveAt: membership.user.lastActiveAt
          ? new Intl.DateTimeFormat(ctx.user.locale, {
              timeZone: ctx.user.timeZone,
            })
              .format(membership.user.lastActiveAt)
              .toLowerCase()
          : null,
        createdAt: membership.createdAt
          ? new Intl.DateTimeFormat(ctx.user.locale, {
              timeZone: ctx.user.timeZone,
            })
              .format(membership.createdAt)
              .toLowerCase()
          : null,
        updatedAt: membership.updatedAt
          ? new Intl.DateTimeFormat(ctx.user.locale, {
              timeZone: ctx.user.timeZone,
            })
              .format(membership.updatedAt)
              .toLowerCase()
          : null,
        avatarUrl: user.avatarUrl,
        ...(ctx.user.organization.isOrgAdmin && { twoFactorEnabled: user.twoFactorEnabled }),
        teams: user.teams
          .filter((team) => team.team.id !== organizationId) // In this context we dont want to return the org team
          .map((team) => {
            if (team.team.id === organizationId) return;
            return {
              id: team.team.id,
              name: team.team.name,
              slug: team.team.slug,
            };
          })
          .filter((team): team is NonNullable<typeof team> => team !== undefined),
        attributes,
      };
    }) || []
  );

  return {
    rows: members || [],
    meta: {
      totalRowCount: totalCount || 0,
    },
  };
};

export default listMembersHandler;
