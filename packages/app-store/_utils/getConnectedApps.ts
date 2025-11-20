import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import { buildNonDelegationCredentials } from "@calcom/lib/delegationCredential";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, AppCategories } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import type { TDependencyData } from "../_appRegistry";
import { PaymentServiceMap } from "../payment.services.generated";
import type { CredentialOwner } from "../types";
import { getAppFromSlug } from "../utils";
import getEnabledAppsFromCredentials from "./getEnabledAppsFromCredentials";

export type ConnectedApps = Awaited<ReturnType<typeof getConnectedApps>>;
type InputSchema = {
  variant?: string | undefined;
  exclude?: Array<string> | null;
  onlyInstalled?: boolean | undefined;
  includeTeamInstalledApps?: boolean | null;
  extendsFeature?: "EventType" | null;
  teamId?: number | null;
  sortByMostPopular?: boolean | null;
  sortByInstalledFirst?: boolean | null;
  categories?: Array<AppCategories> | null;
  appId?: string | null;
};

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

export async function getConnectedApps({
  user,
  prisma,
  input,
}: {
  user: Pick<User, "id" | "name" | "avatarUrl" | "email"> & { avatar?: string };
  prisma: PrismaClient;
  input: InputSchema;
}) {
  const {
    variant,
    exclude,
    onlyInstalled,
    includeTeamInstalledApps,
    extendsFeature,
    teamId,
    sortByMostPopular,
    sortByInstalledFirst,
    appId,
  } = input;
  let credentials = await getUsersCredentialsIncludeServiceAccountKey(user);
  let userTeams: TeamQuery[] = [];

  if (includeTeamInstalledApps || teamId) {
    const teamsQuery = await prisma.team.findMany({
      where: {
        ...(teamId ? { id: teamId } : {}),
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

    const teamAppCredentials = userTeams.flatMap((teamApp) => {
      return teamApp.credentials ? buildNonDelegationCredentials(teamApp.credentials.flat()) : [];
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
              isAdmin: checkAdminOrOwner(team.members[0].role),
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
        const paymentAppImportFn = PaymentServiceMap[app.dirName as keyof typeof PaymentServiceMap];
        if (paymentAppImportFn) {
          const paymentApp = await paymentAppImportFn;
          if (paymentApp && "PaymentService" in paymentApp && paymentApp?.PaymentService) {
            const PaymentService = paymentApp.PaymentService;
            const paymentInstance = new PaymentService(credential);
            isSetupAlready = paymentInstance.isSetupAlready();
          }
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

  if (sortByInstalledFirst) {
    apps.sort((a, b) => {
      return (a.isInstalled ? 0 : 1) - (b.isInstalled ? 0 : 1);
    });
  }

  return {
    items: apps,
  };
}
