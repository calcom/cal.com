import getApps from "@calcom/app-store/utils";
import type { CredentialData } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";

const getEnabledApps = async (userCredentials: CredentialData[], variant: string = null) => {
  const enabledApps = await prisma.app.findMany({
    ...(variant && { where: { category: variant === "conferencing" ? "video" : variant } }),
  });

  const apps = getApps(userCredentials);

  const filteredApps = enabledApps.map((app) => {
    const appMetadata = apps.find((metadata) => metadata.slug === app.slug);
    return { ...appMetadata, enabled: app.enabled };
  });

  return filteredApps;
};

export default getEnabledApps;
