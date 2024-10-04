import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

const getUserTeams = async (userId: number) => {
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
};

export default getUserTeams;
