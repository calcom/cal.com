import { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

const selectByUserId = (userId: number) =>
  Prisma.validator<Prisma.TeamSelect>()({
    id: true,
    credentials: {
      select: credentialForCalendarServiceSelect,
    },
    name: true,
    logoUrl: true,
    members: {
      where: {
        userId,
      },
      select: {
        role: true,
      },
    },
  });

export type TeamQuery = Prisma.TeamGetPayload<{
  select: ReturnType<typeof selectByUserId>;
}>;

export class TeamsRepository {
  async getUserTeams(userId: number) {
    const teamsQuery = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
            accepted: true,
          },
        },
      },
      select: {
        ...selectByUserId(userId),
        parent: { select: selectByUserId(userId) },
      },
    });

    return teamsQuery;
  }
}
