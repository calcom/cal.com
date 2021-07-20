import { Team } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import prisma from "./prisma";
import logger from "./logger";

const log = logger.getChildLogger({ prefix: ["[lib] getTeam"] });

export const getTeam = async (context: GetServerSidePropsContext): Promise<Team | null> => {
  let teamIdOrSlug = null;
  let team = null;

  log.debug(`{env} ${process.env.NODE_ENV}`);

  switch (process.env.NODE_ENV) {
    case "development": {
      if (
        process.env?.TESTING_TEAMS_CUSTOM_DOMAINS &&
        Boolean(parseInt(process.env.TESTING_TEAMS_CUSTOM_DOMAINS))
      ) {
        teamIdOrSlug = process.env.TESTING_TEAMS_TEAM ?? "1";
      }
      break;
    }

    case "production":
    default: {
      const host = context.req.headers.host;
      log.debug(`{host} ${host}`);
      teamIdOrSlug = host.split(".")[0];
      break;
    }
  }

  log.debug(`{teamIdOrSlug} ${teamIdOrSlug}`);

  const teamSelectInput = {
    id: true,
    name: true,
    slug: true,
    members: {
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

  if (teamIdOrSlug && parseInt(teamIdOrSlug)) {
    team = await prisma.team.findFirst({
      where: {
        id: parseInt(teamIdOrSlug),
      },
      select: teamSelectInput,
    });
  } else if (teamIdOrSlug) {
    team = await prisma.team.findFirst({
      where: {
        slug: teamIdOrSlug,
      },
      select: teamSelectInput,
    });
  }

  log.debug(`{team}`, { team });

  return team;
};
