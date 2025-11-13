import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listCalidTeamsHandler = async ({ ctx }: ListTeamOptions) => {
  const userId = ctx.user.id;

  const calIdMembership = await prisma.calIdMembership.findMany({
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

  return calIdMembership.map(({ calIdTeam: { inviteTokens, ...team }, ...membership }) => ({
    role: membership.role,
    acceptedInvitation: membership.acceptedInvitation,
    ...team,
    inviteToken: inviteTokens.find((token) => token.identifier === `invite-link-for-calIdTeamId-${team.id}`),
  }));
};
