import { TeamsList } from "@calid/features/modules/teams/pages/TeamsList";
import type { SearchParams } from "app/_types";
import type { Session } from "next-auth";

import { TeamService } from "@calcom/lib/server/service/teamService";
import prisma from "@calcom/prisma";
import type { RouterOutputs } from "@calcom/trpc/react";

import { TRPCError } from "@trpc/server";

const getCachedCalIdTeams = async (
  userId: number
): Promise<RouterOutputs["viewer"]["calidTeams"]["list"]> => {
  const calIdMemberships = await prisma.calIdMembership.findMany({
    where: {
      userId,
    },
    include: {
      calIdTeam: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          metadata: true,
          inviteTokens: true,
        },
      },
    },
    orderBy: {
      role: "desc",
    },
  });

  return calIdMemberships.map(({ calIdTeam: { inviteTokens, ...team }, ...membership }) => ({
    role: membership.role,
    acceptedInvitation: membership.acceptedInvitation,
    ...team,
    inviteToken:
      inviteTokens.find((token) => token.identifier === `invite-link-for-calIdTeamId-${team.id}`) ||
      undefined,
  }));
};

export const ServerTeamsListing = async ({
  searchParams,
  session,
}: {
  searchParams: SearchParams;
  session: Session;
}) => {
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const userId = session.user.id;

  let teamNameFromInvitation,
    errorMsgFromInvitation = null;

  if (token) {
    try {
      teamNameFromInvitation = await TeamService.inviteMemberByToken(token, userId);
    } catch (e) {
      errorMsgFromInvitation = "Error while fetching teams";
      if (e instanceof TRPCError) errorMsgFromInvitation = e.message;
    }
  }

  const teams = await getCachedCalIdTeams(userId);

  return {
    Main: (
      <TeamsList
        teams={teams}
        teamNameFromInvitation={teamNameFromInvitation}
        errorMsgFromInvitation={errorMsgFromInvitation}
      />
    ),
  };
};
