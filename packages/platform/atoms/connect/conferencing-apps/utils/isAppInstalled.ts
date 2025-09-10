import type { RouterOutputs } from "@calcom/trpc";

type InstalledApp = RouterOutputs["viewer"]["apps"]["integrations"]["items"][0];

interface IIsAppInstalledParams {
  appSlug: string;
  installedApps: InstalledApp[] | undefined;
  orgId?: number;
  teamId?: number;
}

export const isAppInstalled = ({ appSlug, installedApps, orgId, teamId }: IIsAppInstalledParams): boolean => {
  if (!installedApps?.length) return false;

  const app = installedApps.find((app) => app.slug === appSlug);
  if (!app) return false;

  if (!orgId && !teamId) return app.userCredentialIds.length > 0;

  if (!app.teams?.length) return false;

  if (teamId) {
    return app.teams.some((team) => team?.teamId === teamId);
  }

  if (orgId) {
    return app.teams.some((team) => team?.teamId === orgId);
  }

  return false;
};
