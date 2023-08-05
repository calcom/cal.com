import getApps from "@calcom/app-store/utils";
import type { CredentialDataWithTeamName } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";

import type { Prisma } from ".prisma/client";

type EnabledApp = ReturnType<typeof getApps>[number] & { enabled: boolean };

/**
 *
 * @param credentials - Can be user or team credentials
 * @param filterOnCredentials - Only include apps where credentials are present
 * @returns A list of enabled app metadata & credentials tied to them
 */
const getEnabledApps = async (credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) => {
  const filterOnIds = {
    credentials: {
      some: {
        OR: [] as Prisma.CredentialWhereInput[],
      },
    },
  } satisfies Prisma.AppWhereInput;

  if (filterOnCredentials) {
    const userIds: number[] = [],
      teamIds: number[] = [];

    for (const credential of credentials) {
      if (credential.userId) userIds.push(credential.userId);
      if (credential.teamId) teamIds.push(credential.teamId);
    }
    if (userIds.length) filterOnIds.credentials.some.OR.push({ userId: { in: userIds } });
    if (teamIds.length) filterOnIds.credentials.some.OR.push({ teamId: { in: teamIds } });
  }

  const enabledApps = await prisma.app.findMany({
    where: {
      enabled: true,
      ...(filterOnIds.credentials.some.OR.length && filterOnIds),
    },
    select: { slug: true, enabled: true },
  });
  const apps = getApps(credentials, filterOnCredentials);

  const filteredApps = enabledApps.reduce((reducedArray, app) => {
    const appMetadata = apps.find((metadata) => metadata.slug === app.slug);
    if (appMetadata) {
      reducedArray.push({ ...appMetadata, enabled: app.enabled });
    }
    return reducedArray;
  }, [] as EnabledApp[]);

  const defaultApps = apps.reduce((reducedArray, app) => {
    //TODO: should write a more robust logic,for apps which are default
    if (app.isGlobal && app.publisher.toLowerCase().includes("cal")) {
      reducedArray.push({ ...app, enabled: true });
    }
    return reducedArray;
  }, [] as EnabledApp[]);
  //this combined of user credential apps + default apps
  return [...filteredApps, ...defaultApps];
};

export default getEnabledApps;
