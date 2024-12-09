import appStore from "@calcom/app-store";
import type { TDependencyData } from "@calcom/app-store/_appRegistry";
import type { CredentialOwner } from "@calcom/app-store/types";
import { getAppFromSlug } from "@calcom/app-store/utils";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TeamQuery } from "@calcom/trpc/server/routers/loggedInViewer/integrations.handler";
import type { TIntegrationsInputSchema } from "@calcom/trpc/server/routers/loggedInViewer/integrations.schema";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PaymentApp } from "@calcom/types/PaymentService";

export type ConnectedApps = Awaited<ReturnType<typeof getConnectedApps>>;

export async function getConnectedApps({
  user,
  prisma,
  input,
}: {
  user: Pick<User, "id" | "name" | "avatarUrl"> & { avatar?: string };
  prisma: PrismaClient;
  input: TIntegrationsInputSchema;
}) {
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
          // Only add parent team if it's not already in teamsQuery
          if (!teamsQuery.some((t) => t.id === parent.id)) {
            parentTeams.push(parent);
          }
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
        avatar: user?.avatar ?? user?.avatarUrl,
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

      let dependencyData: TDependencyData = [];
      if (app.dependencies?.length) {
        dependencyData = app.dependencies.map((dependency) => {
          const dependencyInstalled = enabledApps.some(
            (dbAppIterator) => dbAppIterator.credentials.length && dbAppIterator.slug === dependency
          );
          // If the app marked as dependency is simply deleted from the codebase, we can have the situation where App is marked installed in DB but we couldn't get the app.
          const dependencyName = getAppFromSlug(dependency)?.name;
          return { name: dependencyName, installed: dependencyInstalled };
        });
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
        ...(app.dependencies && { dependencyData }),
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
}
