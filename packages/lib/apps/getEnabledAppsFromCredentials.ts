import type { Prisma } from "@prisma/client";

import type { CredentialDataWithTeamName } from "@calcom/app-store/utils";
import getApps from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";

type EnabledApp = ReturnType<typeof getApps>[number] & { enabled: boolean };

/**
 *
 * @param credentials - Can be user or team credentials
 * @param options
 * @param options.where Aditional where conditions to filter out apps
 * @param options.filterOnCredentials - Only include apps where credentials are present
 * @returns A list of enabled app metadata & credentials tied to them
 */
const getEnabledAppsFromCredentials = async (
  credentials: CredentialDataWithTeamName[],
  options?: {
    where?: Prisma.AppWhereInput;
    filterOnCredentials?: boolean;
  }
) => {
  const { where: _where = {}, filterOnCredentials = false } = options || {};
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

  const where: Prisma.AppWhereInput = {
    enabled: true,
    ..._where,
    ...(filterOnIds.credentials.some.OR.length && filterOnIds),
  };

  const enabledApps = await prisma.app.findMany({
    where,
    select: { slug: true, enabled: true },
  });
  const apps = getApps(credentials, filterOnCredentials);
  const filteredApps = apps.reduce((reducedArray, app) => {
    const appDbQuery = enabledApps.find((metadata) => metadata.slug === app.slug);
    if (appDbQuery?.enabled || app.isGlobal) {
      reducedArray.push({ ...app, enabled: true });
    }
    return reducedArray;
  }, [] as EnabledApp[]);

  return filteredApps;
};

export default getEnabledAppsFromCredentials;
