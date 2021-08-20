import { Team } from "@prisma/client";
import prisma from "@lib/prisma";
import logger from "@lib/logger";

const log = logger.getChildLogger({ prefix: ["[lib] getTeam"] });
export const getTeam = async (idOrSlug: string): Promise<Team | null> => {
  const teamIdOrSlug = idOrSlug;

  let team = null;

  log.debug(`{teamIdOrSlug} ${teamIdOrSlug}`);

  const teamSelectInput = {
    id: true,
    name: true,
    slug: true,
    members: {
      where: {
        accepted: true,
      },
      select: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            bio: true,
            avatar: true,
            theme: true,
          },
        },
      },
    },
  };

  team = await prisma.team.findFirst({
    where: {
      OR: [
        {
          id: parseInt(teamIdOrSlug) || undefined,
        },
        {
          slug: teamIdOrSlug,
        },
      ],
    },
    select: teamSelectInput,
  });

  log.debug(`{team}`, { team });

  return team;
};
