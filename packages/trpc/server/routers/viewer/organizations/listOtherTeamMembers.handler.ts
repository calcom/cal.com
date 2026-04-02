import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { MembershipRole, type Prisma } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";
import z from "zod";
import type { TrpcSessionUser } from "../../../types";

export const ZListOtherTeamMembersSchema = z.object({
  teamId: z.number(),
  query: z.string().optional(),
  limit: z.number(),
  offset: z.number().optional(),
  cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
});

export type TListOtherTeamMembersSchema = z.infer<typeof ZListOtherTeamMembersSchema>;

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListOtherTeamMembersSchema;
};

export const listOtherTeamMembers = async ({ ctx, input }: ListOptions) => {
  const whereConditional: Prisma.MembershipWhereInput = {
    teamId: input.teamId,
  };
  // const { limit = 20 } = input;
  // let { offset = 0 } = input;

  const { cursor, limit } = input;

  if (input.query) {
    whereConditional.user = {
      OR: [
        {
          username: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: input.query,
            mode: "insensitive",
          },
        },
      ],
    };
  }

  const team = await prisma.team.findUnique({
    where: {
      id: input.teamId,
    },
    select: {
      parentId: true,
    },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  if (!team.parentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team does not belong to an organization",
    });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: team.parentId,
    permission: "team.listMembers",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to view team members in this organization",
    });
  }

  const members = await prisma.membership.findMany({
    where: whereConditional,
    select: {
      id: true,
      role: true,
      accepted: true,
      disableImpersonation: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    distinct: ["userId"],
    orderBy: { role: "desc" },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
  });
  let nextCursor: typeof cursor | undefined;
  if (members && members.length > limit) {
    const nextItem = members.pop();
    nextCursor = nextItem?.id || null;
  }

  const users = members.map((membership) => membership.user);
  const enrichedUsers = await new UserRepository(prisma).enrichUsersWithTheirProfileExcludingOrgMetadata(
    users
  );

  const enrichedUserMap = new Map<number, (typeof enrichedUsers)[0]>();
  enrichedUsers.forEach((enrichedUser) => {
    enrichedUserMap.set(enrichedUser.id, enrichedUser);
  });

  const enrichedMemberships = [];
  for (const membership of members) {
    const enrichedUser = enrichedUserMap.get(membership.user.id);
    if (!enrichedUser) continue;
    enrichedMemberships.push({
      ...membership,
      user: enrichedUser,
    });
  }
  return {
    rows: enrichedMemberships.map((m) => {
      return {
        ...m,
        bookerUrl: getBookerBaseUrlSync(m.user.profile?.organization?.slug || ""),
      };
    }),
    nextCursor,
  };
};

export default listOtherTeamMembers;
