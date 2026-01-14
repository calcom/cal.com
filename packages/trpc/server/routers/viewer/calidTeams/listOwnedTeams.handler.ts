import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOwnedTeamsHandler = async ({ ctx }: ListOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      calIdTeams: {
        where: {
          acceptedInvitation: true,
          role: {
            in: [CalIdMembershipRole.OWNER, CalIdMembershipRole.ADMIN],
          },
        },
        select: {
          calIdTeam: true,
        },
      },
    },
  });

  return user?.calIdTeams?.map(({ calIdTeam }) => calIdTeam);
};
