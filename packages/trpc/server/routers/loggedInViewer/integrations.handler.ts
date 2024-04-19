import type { Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { CredentialOwner } from "@calcom/app-store/types";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PaymentApp } from "@calcom/types/PaymentService";

import type { TIntegrationsInputSchema } from "./integrations.schema";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

type TeamQuery = Prisma.TeamGetPayload<{
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

// type TeamQueryWithParent = TeamQuery & {
//   parent?: TeamQuery | null;
// };

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const { user } = ctx;
  const {
    variant,
    exclude,
    onlyInstalled,
    includeTeamInstalledApps,
    extendsFeature,
    teamId,
    sortByMostPopular,
    appId,
  } = input;
  let credentials = await getUsersCredentials(user);
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
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
        name: true,
        logoUrl: true,
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
            credentials: {
              select: credentialForCalendarServiceSelect,
            },
            name: true,
            logoUrl: true,
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

    const teamAppCredentials: CredentialPayload[] = userTeams.flatMap((teamApp) => {
      return teamApp.credentials ? teamApp.credentials.flat() : [];
    });
    if (!includeTeamInstalledApps || teamId) {
      credentials = teamAppCredentials;
    } else {
      credentials = credentials.concat(teamAppCredentials);
    }
  }

  const enabledApps = await getEnabledAppsFromCredentials(credentials, {
    filterOnCredentials: onlyInstalled,
    ...(appId ? { where: { slug: appId } } : {}),
  });
  //TODO: Refactor this to pick up only needed fields and prevent more leaking
  let apps = await Promise.all(
    enabledApps.map(async ({ credentials: _, credential, key: _2 /* don't leak to frontend */, ...app }) => {
      const userCredentialIds = credentials.filter((c) => c.appId === app.slug && !c.teamId).map((c) => c.id);
      const invalidCredentialIds = credentials
        .filter((c) => c.appId === app.slug && c.invalid)
        .map((c) => c.id);
      const teams = await Promise.all(
        credentials
          .filter((c) => c.appId === app.slug && c.teamId)
          .map(async (c) => {
            const team = userTeams.find((team) => team.id === c.teamId);
            if (!team) {
              return null;
            }
            return {
              teamId: team.id,
              name: team.name,
              logoUrl: team.logoUrl,
              credentialId: c.id,
              isAdmin:
                team.members[0].role === MembershipRole.ADMIN ||
                team.members[0].role === MembershipRole.OWNER,
            };
          })
      );
      // type infer as CredentialOwner
      const credentialOwner: CredentialOwner = {
        name: user.name,
        avatar: user.avatar,
      };

      // We need to know if app is payment type
      // undefined it means that app don't require app/setup/page
      let isSetupAlready = undefined;
      if (credential && app.categories.includes("payment")) {
        const paymentApp = (await appStore[app.dirName as keyof typeof appStore]?.()) as PaymentApp | null;
        if (paymentApp && "lib" in paymentApp && paymentApp?.lib && "PaymentService" in paymentApp?.lib) {
          const PaymentService = paymentApp.lib.PaymentService;
          const paymentInstance = new PaymentService(credential);
          isSetupAlready = paymentInstance.isSetupAlready();
        }
      }

      return {
        ...app,
        ...(teams.length && {
          credentialOwner,
        }),
        userCredentialIds,
        invalidCredentialIds,
        teams,
        isInstalled: !!userCredentialIds.length || !!teams.length || app.isGlobal,
        isSetupAlready,
      };
    })
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

  if (sortByMostPopular) {
    const installCountPerApp = await getInstallCountPerApp();

    // sort the apps array by the most popular apps
    apps.sort((a, b) => {
      const aCount = installCountPerApp[a.slug] || 0;
      const bCount = installCountPerApp[b.slug] || 0;
      return bCount - aCount;
    });
  }

  return {
    items: apps,
  };
};
