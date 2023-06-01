import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TIntegrationsInputSchema } from "./integrations.schema";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const { user } = ctx;
  const { variant, exclude, onlyInstalled, includeTeamInstalledApps } = input;
  let { credentials } = user,
    userAdminTeams = [];

  if (includeTeamInstalledApps) {
    // Get app credentials that the user is an admin or owner to
    userAdminTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            id: user.userId,
            role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
          },
        },
      },
      select: {
        id: true,
        credentials: true,
        name: true,
        logo: true,
      },
    });
    const teamAppCredentials = [];
    userAdminTeams.forEach((teamApp) => {
      teamAppCredentials.push(...teamApp.credentials.flat());
    });
    credentials = [...credentials, ...teamAppCredentials];
  }

  const enabledApps = await getEnabledApps(credentials);
  //TODO: Refactor this to pick up only needed fields and prevent more leaking
  let apps = enabledApps.map(
    ({ credentials: _, credential: _1, key: _2 /* don't leak to frontend */, ...app }) => {
      const credentialIds = credentials.filter((c) => c.type === app.type).map((c) => c.id);
      const invalidCredentialIds = credentials
        .filter((c) => c.type === app.type && c.invalid)
        .map((c) => c.id);
      const teams = credentials
        .filter((c) => c.type === app.type && c.teamId)
        .map((c) => {
          const team = userAdminTeams.find((team) => team.id === c.teamId);
          return { teamId: team.id, name: team.name, logo: team.logo, credentialId: c.id };
        });
      return {
        ...app,
        credentialIds,
        invalidCredentialIds,
        teams,
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
    apps = apps.flatMap((item) => (item.credentialIds.length > 0 || item.isGlobal ? [item] : []));
  }
  return {
    items: apps,
  };
};
