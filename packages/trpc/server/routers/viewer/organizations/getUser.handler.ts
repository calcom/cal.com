import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetUserInput } from "./getUser.schema";

type AdminVerifyOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetUserInput;
};

export async function getUserHandler({ input, ctx }: AdminVerifyOptions) {
  const currentUser = ctx.user;

  if (!currentUser.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // Get user's membership role in the organization
  const currentUserMembership = await prisma.membership.findFirst({
    where: {
      userId: currentUser.id,
      teamId: currentUser.organizationId,
    },
    select: {
      role: true,
    },
  });

  if (!currentUserMembership) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not a member of this organization." });
  }

  // Check PBAC permissions for viewing/editing organization members
  const permissions = await getSpecificPermissions({
    userId: currentUser.id,
    teamId: currentUser.organizationId,
    resource: Resource.Organization,
    userRole: currentUserMembership.role,
    actions: [CustomAction.ListMembers, CustomAction.ChangeMemberRole],
    fallbackRoles: {
      [CustomAction.ListMembers]: {
        roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.ChangeMemberRole]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  // User needs either ListMembers (to view) or ChangeMemberRole (to edit) permission
  if (!permissions[CustomAction.ListMembers] || !permissions[CustomAction.ChangeMemberRole]) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // get requested user from database and ensure they are in the same organization
  const [requestedUser, membership, teams] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        timeZone: true,
        schedules: {
          select: {
            id: true,
            name: true,
          },
        },
        profiles: {
          select: {
            username: true,
          },
        },
      },
    }),
    // Query on accepted as we don't want the user to be able to get this much info on a user that hasn't accepted the invite
    prisma.membership.findFirst({
      where: {
        userId: input.userId,
        teamId: currentUser.organizationId,
        accepted: true,
      },
      select: {
        role: true,
      },
    }),
    prisma.membership.findMany({
      where: {
        userId: input.userId,
        team: {
          parentId: currentUser.organizationId,
        },
      },
      select: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        accepted: true,
      },
    }),
  ]);

  if (!requestedUser || !membership)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "user_not_exist_or_not_in_org" });

  const foundUser = {
    ...requestedUser,
    // Enrich with the users profile for the username or fall back to the username their account was created with.
    username: requestedUser.profiles[0]?.username || requestedUser.username,
    teams: teams.map((team) => ({
      ...team.team,
      accepted: team.accepted,
    })),
    role: membership.role,
  };

  return foundUser;
}

export default getUserHandler;
