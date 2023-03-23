import getApps from "@calcom/app-store/utils";
import type { CredentialData } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";

const getEnabledApps = async (userCredentials: CredentialData[]) => {
  const enabledApps = await prisma.app.findMany({
    where: { enabled: true },
    select: { slug: true, enabled: true },
  });
  const apps = getApps(userCredentials);

  const filteredApps = enabledApps.reduce((reducedArray, app) => {
    const appMetadata = apps.find((metadata) => metadata.slug === app.slug);
    if (appMetadata) {
      reducedArray.push({ ...appMetadata, enabled: app.enabled });
    }
    return reducedArray;
  }, [] as (ReturnType<typeof getApps>[number] & { enabled: boolean })[]);

  return filteredApps;
};

export default getEnabledApps;
