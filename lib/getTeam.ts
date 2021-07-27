import { Team } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import prisma from "./prisma";
import logger from "./logger";

const log = logger.getChildLogger({ prefix: ["[lib] getTeam"] });

export const getTeamFromContext = async (context: GetServerSidePropsContext): Promise<Team | null> => {
  let teamIdOrSlug = null;
  let customDomain = null;

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
      let host = context.req?.headers?.host;
      if (!host.endsWith("calendso.com")) {
        customDomain = host;
      } else if (host.endsWith("staging.calendso.com")) {
        host = host.replace("staging.calendso.com", "");
      } else if (host.endsWith("app.calendso.com")) {
        host = host.replace("app.calendso.com", "");
      } else if (host.endsWith("calendso.com")) {
        host = host.replace("calendso.com", "");
      }

      log.debug(`{host} ${host}`);
      teamIdOrSlug = host ? host.split(".")[0] : null;

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

  if (customDomain) {
    log.debug(`{using custom domain}`, { customDomain });
    team = await prisma.team.findFirst({
      where: {
        customDomain: customDomain,
      },
      select: teamSelectInput,
    });
  } else if (teamIdOrSlug) {
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
  }

  log.debug(`{team}`, { team });

  return team;
};

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
