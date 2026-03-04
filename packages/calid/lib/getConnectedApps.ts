import type { Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { TDependencyData } from "@calcom/app-store/_appRegistry";
import type { CredentialOwner } from "@calcom/app-store/types";
import { getAppFromSlug } from "@calcom/app-store/utils";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import { buildNonDelegationCredentials } from "@calcom/lib/delegationCredential/clientAndServer";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/lib/server/getUsersCredentials";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { AppCategories } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { PaymentApp } from "@calcom/types/PaymentService";

import { checkIfMemberAdminorOwner } from "../modules/teams/lib/checkIfMemberAdminorOwner";

export type CalIdConnectedApps = Awaited<ReturnType<typeof getCalIdConnectedApps>>;

type CalIdInputSchema = {
  variant?: string | undefined;
  exclude?: Array<string> | null;
  onlyInstalled?: boolean | undefined;
  includeCalIdTeamInstalledApps?: boolean | null;
  extendsFeature?: "EventType" | null;
  calIdTeamId?: number | null;
  sortByMostPopular?: boolean | null;
  sortByInstalledFirst?: boolean | null;
  categories?: Array<AppCategories> | null;
  appId?: string | null;
};

export type CalIdTeamQuery = Prisma.CalIdTeamGetPayload<{
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

export async function getCalIdConnectedApps({
  user,
  prisma,
  input,
}: {
  user: Pick<User, "id" | "name" | "avatarUrl" | "email"> & { avatar?: string };
  prisma: PrismaClient;
  input: CalIdInputSchema;
}) {
  const {
    variant,
    exclude,
    onlyInstalled,
    includeCalIdTeamInstalledApps,
    extendsFeature,
    calIdTeamId,
    sortByMostPopular,
    sortByInstalledFirst,
    appId,
  } = input;

  let credentials = await getUsersCredentialsIncludeServiceAccountKey(user);
  let userCalIdTeams: CalIdTeamQuery[] = [];
  let calIdTeam: any;
  let userMembershipInTeam: any;

  if (includeCalIdTeamInstalledApps || calIdTeamId) {
    userCalIdTeams = await prisma.calIdTeam.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
            acceptedInvitation: true,
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
            userId: true,
          },
        },
      },
    });

    calIdTeam = userCalIdTeams.find((calIdTeam) => calIdTeam.id === calIdTeamId);

    userMembershipInTeam = calIdTeam?.members.find((member: any) => member.userId === user.id);

    const isOwnerOfEventTeam = checkIfMemberAdminorOwner(userMembershipInTeam?.role);

    const calIdTeamAppCredentials = userCalIdTeams.flatMap((calIdTeamApp) => {
      return calIdTeamApp.credentials ? buildNonDelegationCredentials(calIdTeamApp.credentials.flat()) : [];
    });

    // For team-specific event types, only show team-level credentials.
    if (calIdTeamId) {
      // Filter credentials to only include those from the specific team

      const ownerScopedCreds = credentials.filter((cr) => {
        console.log("App: ", cr.appId);

        const appMeta = getAppFromSlug(cr.appId);

        console.log("App Meta: ", appMeta);
        return cr.userId === user.id && appMeta?.owner_scoped_installation;
      });

      console.log("Owner Scoped Creds: ", ownerScopedCreds);

      credentials = [
        ...calIdTeamAppCredentials.filter((c) => c.calIdTeamId === calIdTeamId),
        ...ownerScopedCreds,
      ];
    } else if (!includeCalIdTeamInstalledApps) {
      credentials = calIdTeamAppCredentials;
    } else {
      // For the general apps listing (not team-specific event types),
      // show both user and team credentials
      credentials = credentials.concat(calIdTeamAppCredentials);
    }
  }

  const enabledApps = await getEnabledAppsFromCredentials(credentials, {
    filterOnCredentials: onlyInstalled,
    ...(appId ? { where: { slug: appId } } : {}),
  });

  //TODO: Refactor this to pick up only needed fields and prevent more leaking
  let apps = await Promise.all(
    enabledApps.map(async ({ credentials: _, credential, key: _2, ...app }) => {
      const userCredentialIds: Array<number> = Array.from(
        new Set(credentials.filter((c) => c.appId === app.slug && !c.calIdTeamId).map((c) => c.id))
      );

      const invalidCredentialIds = credentials
        .filter((c) => c.appId === app.slug && c.invalid)
        .map((c) => c.id);
      const calIdTeams = await Promise.all(
        credentials
          .filter((c) => c.appId === app.slug && c.calIdTeamId)
          .map(async (c) => {
            if (!calIdTeam) {
              return null;
            }
            return {
              calIdTeamId: calIdTeam.id,
              name: calIdTeam.name,
              logoUrl: calIdTeam.logoUrl,
              credentialId: c.id,
              isAdmin: userMembershipInTeam?.role === "OWNER",
              userRole: userMembershipInTeam?.role,
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
      let isSetupAlready: boolean | undefined;
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
        ...(calIdTeams.length && {
          credentialOwner,
        }),
        userCredentialIds,
        invalidCredentialIds,
        calIdTeams,
        isInstalled: !!userCredentialIds.length || !!calIdTeams.length || app.isGlobal,
        isSetupAlready,
        ...(app.dependencies && { dependencyData }),
      };
    })
  );

  if (variant) {
    apps = apps.flatMap((item) => (item.variant.startsWith(variant) ? [item] : []));
  }

  if (exclude) {
    // exclusion filter
    apps = apps.filter((item) => (exclude ? !exclude.includes(item.variant) : true));
  }

  if (onlyInstalled) {
    apps = apps.flatMap((item) =>
      item.userCredentialIds.length > 0 || item.calIdTeams.length || item.isGlobal ? [item] : []
    );
  }

  if (extendsFeature) {
    apps = apps
      .filter((app) => app.extendsFeature?.includes(extendsFeature))
      .map((app) => ({
        ...app,
        isInstalled: !!app.userCredentialIds?.length || !!app.calIdTeams?.length || app.isGlobal,
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
