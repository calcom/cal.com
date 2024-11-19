import type { TDependencyData } from "@calcom/app-store/_appRegistry";
import type { LocationOption } from "@calcom/app-store/utils";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import type { TIntegrationsInputSchema } from "@calcom/trpc/server/routers/loggedInViewer/integrations.schema";
import type { App } from "@calcom/types/App";

export type EnabledAppType = App & {
  enabled: boolean;
  userCredentialIds: number[];
  invalidCredentialIds: number[];
  locationOption: LocationOption | null;
  teams: ({
    teamId: number;
    name: string;
    logoUrl: string | null;
    credentialId: number;
    isAdmin: boolean;
  } | null)[];
  isInstalled: boolean | undefined;
  isSetupAlready: boolean | undefined;
  dependencyData?: TDependencyData;
};

const transformAppsBasedOnInput = async ({
  apps,
  input,
}: {
  apps: EnabledAppType[];
  input: Omit<TIntegrationsInputSchema, "includeTeamInstalledApps" | "teamId" | "categories" | "appId">;
}) => {
  const { variant, exclude, onlyInstalled, extendsFeature, sortByMostPopular } = input;
  const transformedApps = apps;

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

  return transformedApps;
};

export default transformAppsBasedOnInput;
