import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export type TeamQuery = Prisma.TeamGetPayload<{
  select: {
    id: true;
    credentials: {
      select: typeof import("@calcom/prisma/selects/credential").credentialForCalendarServiceSelect;
    };
    name: true;
    logoUrl: true;
    members: {
      select: {
        role: true;
      };
    };
  };
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
        parent: {
          select: {
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
          },
        },
      },
    });

    return teamsQuery;
  }
}
