import type { Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { TDependencyData } from "@calcom/app-store/_appRegistry";
import type { CredentialOwner } from "@calcom/app-store/types";
import { getAppFromSlug } from "@calcom/app-store/utils";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import getTeamAppCredentials from "@calcom/lib/apps/getTeamAppCredentials";
import getUserAvailableTeams from "@calcom/lib/apps/getUserAvailableTeams";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { PaymentApp } from "@calcom/types/PaymentService";

import type { TIntegrationsInputSchema } from "./integrations.schema";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
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
    userTeams = await getUserAvailableTeams(user.id, teamId);
    credentials = getTeamAppCredentials(userTeams, credentials, includeTeamInstalledApps);
  }

  // start refactor for enabled apps here
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
      // this can be refactored into its own function
      // construct teams for app starts here
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
      // construct teams for app ends here

      // type infer as CredentialOwner
      const credentialOwner: CredentialOwner = {
        name: user.name,
        avatar: user.avatar,
      };

      // construct isSetupAlready starts here
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
      // construct isSetupAlready ends here

      // construct app dependency data starts here
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
      // construct app dependency data ends here

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
  // end refactor for enabled apps here

  // its fine if we dont refactor below stuff, its just an if conditional so thats alright
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
