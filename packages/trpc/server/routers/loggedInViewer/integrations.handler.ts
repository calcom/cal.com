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
    credentials: true;
    name: true;
    logo: true;
  };
}>;

type TeamQueryWithParent = TeamQuery & {
  parent?: TeamQuery | null;
};

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const { user } = ctx;
  const { variant, exclude, onlyInstalled, includeTeamInstalledApps, extendsFeature, teamId } = input;
  let { credentials } = user;
  let userAdminTeams: TeamQueryWithParent[] = [];

  if (includeTeamInstalledApps || teamId) {
    // Get app credentials that the user is an admin or owner to
    userAdminTeams = await prisma.team.findMany({
      where: {
        ...(teamId && { id: teamId }),
        members: {
          some: {
            userId: user.id,
            role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
          },
        },
      },
      select: {
        id: true,
        credentials: true,
        name: true,
        logo: true,
        parent: {
          select: {
            id: true,
            credentials: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    // If a team is a part of an org then include those apps
    // Don't want to iterate over these parent teams
    const parentTeams: TeamQueryWithParent[] = [];
    // Only loop and grab parent teams if a teamId was given. If not then all teams will be queried
    if (teamId) {
      userAdminTeams.forEach((team) => {
        if (team?.parent) {
          parentTeams.push(team.parent);
          delete team.parent;
        }
      });
    }

    userAdminTeams = [...userAdminTeams, ...parentTeams];

    const teamAppCredentials: Credential[] = userAdminTeams.flatMap((teamApp) => teamApp.credentials.flat());
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
      const credentialIds = credentials.filter((c) => c.type === app.type && !c.teamId).map((c) => c.id);
      const invalidCredentialIds = credentials
        .filter((c) => c.type === app.type && c.invalid)
        .map((c) => c.id);
      const teams = credentials
        .filter((c) => c.type === app.type && c.teamId)
        .map((c) => {
          const team = userAdminTeams.find((team) => team.id === c.teamId);
          if (!team) {
            return null;
          }
          return { teamId: team.id, name: team.name, logo: team.logo, credentialId: c.id };
        });
      return {
        ...app,
        ...(teams.length && { credentialOwner: { name: user.name, avatar: user.avatar } }),
        credentialIds,
        invalidCredentialIds,
        teams,
        isInstalled: !!credentialIds.length || !!teams.length || app.isGlobal,
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
      item.credentialIds.length > 0 || item.teams.length || item.isGlobal ? [item] : []
    );
  }

  if (extendsFeature) {
    apps = apps
      .filter((app) => app.extendsFeature?.includes(extendsFeature))
      .map((app) => ({
        ...app,
        isInstalled: !!app.credentialIds?.length || !!app.teams?.length || app.isGlobal,
      }));
  }

  return {
    items: apps,
  };
};
