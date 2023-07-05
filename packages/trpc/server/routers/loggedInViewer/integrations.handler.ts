import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TIntegrationsInputSchema } from "./integrations.schema";
import type { Prisma, Credential } from ".prisma/client";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

type TeamQuery = Prisma.TeamGetPayload<{
  select: {
    id: true;
    credentials?: true;
    name: true;
    logo: true;
    members: {
      select: {
        role: true;
      };
    };
  };
}>;

// type TeamQueryWithParent = TeamQuery & {
//   parent?: TeamQuery | null;
// };

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const { user } = ctx;
  const { variant, exclude, onlyInstalled, includeTeamInstalledApps, extendsFeature, teamId } = input;
  let { credentials } = user;
  let userTeams: TeamQuery[] = [];

  if (includeTeamInstalledApps || teamId) {
    const teamsQuery = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
            accepted: true,
          },
        },
      },
      select: {
        id: true,
        credentials: true,
        name: true,
        logo: true,
        members: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
        parent: {
          select: {
            id: true,
            credentials: true,
            name: true,
            logo: true,
            members: {
              where: {
                userId: user.id,
              },
              select: {
                role: true,
              },
            },
          },
        },
      },
    });
    // If a team is a part of an org then include those apps
    // Don't want to iterate over these parent teams
    const filteredTeams: TeamQuery[] = [];
    const parentTeams: TeamQuery[] = [];
    // Only loop and grab parent teams if a teamId was given. If not then all teams will be queried
    if (teamId) {
      teamsQuery.forEach((team) => {
        if (team?.parent) {
          const { parent, ...filteredTeam } = team;
          filteredTeams.push(filteredTeam);
          parentTeams.push(parent);
        }
      });
    }

    userTeams = [...teamsQuery, ...parentTeams];

    const teamAppCredentials: Credential[] = userTeams.flatMap((teamApp) => {
      return teamApp.credentials ? teamApp.credentials.flat() : [];
    });
    if (!includeTeamInstalledApps || teamId) {
      credentials = teamAppCredentials;
    } else {
      credentials = credentials.concat(teamAppCredentials);
    }
  }

  const enabledApps = await getEnabledApps(credentials);
  //TODO: Refactor this to pick up only needed fields and prevent more leaking
  let apps = enabledApps.map(
    ({ credentials: _, credential: _1, key: _2 /* don't leak to frontend */, ...app }) => {
      const userCredentialIds = credentials.filter((c) => c.type === app.type && !c.teamId).map((c) => c.id);
      const invalidCredentialIds = credentials
        .filter((c) => c.type === app.type && c.invalid)
        .map((c) => c.id);
      const teams = credentials
        .filter((c) => c.type === app.type && c.teamId)
        .map((c) => {
          const team = userTeams.find((team) => team.id === c.teamId);
          if (!team) {
            return null;
          }
          return {
            teamId: team.id,
            name: team.name,
            logo: team.logo,
            credentialId: c.id,
            isAdmin:
              team.members[0].role === MembershipRole.ADMIN || team.members[0].role === MembershipRole.OWNER,
          };
        });
      return {
        ...app,
        ...(teams.length && { credentialOwner: { name: user.name, avatar: user.avatar } }),
        userCredentialIds,
        invalidCredentialIds,
        teams,
        isInstalled: !!userCredentialIds.length || !!teams.length || app.isGlobal,
      };
    }
  );

  if (variant) {
    // `flatMap()` these work like `.filter()` but infers the types correctly
    apps = apps
      // variant check
      .flatMap((item) => (item.variant.startsWith(variant) ? [item] : []));
  }

  if (exclude) {
    // exclusion filter
    apps = apps.filter((item) => (exclude ? !exclude.includes(item.variant) : true));
  }

  if (onlyInstalled) {
    apps = apps.flatMap((item) =>
      item.userCredentialIds.length > 0 || item.teams.length || item.isGlobal ? [item] : []
    );
  }

  if (extendsFeature) {
    apps = apps
      .filter((app) => app.extendsFeature?.includes(extendsFeature))
      .map((app) => ({
        ...app,
        isInstalled: !!app.userCredentialIds?.length || !!app.teams?.length || app.isGlobal,
      }));
  }

  return {
    items: apps,
  };
};
