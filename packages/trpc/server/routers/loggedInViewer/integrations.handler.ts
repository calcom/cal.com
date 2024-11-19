import type { CredentialOwner } from "@calcom/app-store/types";
import type { TeamQuery } from "@calcom/ee/teams/teams.repository";
import checkAppSetupStatus from "@calcom/lib/apps/checkAppSetupStatus";
import constructUserTeams from "@calcom/lib/apps/constructUserTeams";
import getAppDependencyData from "@calcom/lib/apps/getAppDependencyData";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import getUserAvailableTeams from "@calcom/lib/apps/getUserAvailableTeams";
import mergeUserAndTeamAppCredentials from "@calcom/lib/apps/mergeUserAndTeamAppCredentials";
import transformAppsBasedOnInput from "@calcom/lib/apps/transformAppsBasedOnInput";
import type { EnabledAppType } from "@calcom/lib/apps/transformAppsBasedOnInput";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
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
  const isUserPartOfTeam = includeTeamInstalledApps || teamId;

  let credentials = await getUsersCredentials(user);
  let userTeams: TeamQuery[] = [];

  if (isUserPartOfTeam) {
    userTeams = await getUserAvailableTeams(user.id, teamId);
    credentials = mergeUserAndTeamAppCredentials(userTeams, credentials, includeTeamInstalledApps);
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
      const teams = await constructUserTeams(credentials, app.slug, userTeams);
      const dependencyData = getAppDependencyData(enabledApps, app.dependencies);
      const isSetupAlready = await checkAppSetupStatus(
        credential,
        app.categories.includes("payment"),
        app.dirName
      );

      // type infer as CredentialOwner
      const credentialOwner: CredentialOwner = {
        name: user.name,
        avatar: user.avatar,
      };

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
      } as EnabledAppType;
    })
  );

  apps = await transformAppsBasedOnInput({
    apps,
    input: { exclude, extendsFeature, onlyInstalled, sortByMostPopular, variant },
  });

  return {
    items: apps,
  };
};
