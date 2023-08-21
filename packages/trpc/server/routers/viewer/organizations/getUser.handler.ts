import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
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

  // check if user is admin of organization
  if (!(await isOrganisationAdmin(currentUser?.id, currentUser.organizationId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  // get requested user from database and ensure they are in the same organization
  const [requestedUser, membership, teams] = await prisma.$transaction([
    prisma.user.findFirst({
      where: { id: input.userId, organizationId: currentUser.organizationId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        timeZone: true,
        schedules: {
          select: {
            id: true,
            name: true,
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
    teams: teams.map((team) => ({
      ...team.team,
      accepted: team.accepted,
    })),
    role: membership.role,
  };

  return foundUser;
}

export default getUserHandler;
