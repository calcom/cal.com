import { type PrismaClient } from "@prisma/client";

import { CAL_URL } from "@calcom/lib/constants";
import {
  getMemberShipSync,
  canCreateEntitySync,
  getTeamSlug,
  isOrganization,
} from "@calcom/lib/entityPermissionUtils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type TeamsAndUserProfileOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const teamsAndUserProfilesQuery = async ({ ctx }: TeamsAndUserProfileOptions) => {
  const { prisma } = ctx;

  const teamSelect = {
    id: true,
    parentId: true,
    name: true,
    slug: true,
    children: true,
    metadata: true,
    members: {
      select: {
        userId: true,
      },
    },
  };

  const membershipSelect = {
    role: true,
    team: {
      select: teamSelect,
    },
  };
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      teams: {
        where: {
          accepted: true,
        },
        select: membershipSelect,
      },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const childrenTeams = await prisma.membership.findMany({
    where: {
      teamId: {
        in: user.teams
          // Skip existing child teams that we have
          .filter((membership) => !membership.team.parentId)
          .map((membership) => membership.team.id),
      },
    },
    select: membershipSelect,
  });

  console.log("CHILDREN TEAMS", childrenTeams);
  user.teams.push(...childrenTeams);

  const image = user?.username ? `${CAL_URL}/${user.username}/avatar.png` : undefined;
  const nonOrgTeams = user.teams.filter((membership) => !isOrganization({ team: membership.team }));

  return [
    {
      teamId: null,
      name: user.name,
      slug: user.username,
      image,
      readOnly: false,
    },
    ...user.teams
      .filter((membership) => isOrganization({ team: membership.team }))
      .map((membership) => {
        return {
          teamId: membership.team.id,
          name: membership.team.name,
          slug: getTeamSlug({
            team: membership.team,
          }),
          image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
          role: getMemberShipSync({
            user,
            teamId: membership.team.id,
          }).role,
          readOnly: !canCreateEntitySync({
            user,
            targetTeamId: membership.team.id,
          }),
        };
      }),
  ];
};
