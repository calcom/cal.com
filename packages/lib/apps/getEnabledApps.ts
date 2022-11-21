import getApps from "@calcom/app-store/utils";
import type { CredentialData } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";

const getEnabledApps = async (userCredentials: CredentialData[], variant: string = null) => {
  const enabledApps = await prisma.app.findMany({
    ...(variant && { where: { category: variant === "conferencing" ? "video" : variant } }),
  });

  let apps = getApps(userCredentials);

  apps = apps.filter((app) => enabledApps.some((enabledApp) => enabledApp.slug === app.slug));

  return apps;
};

export default getEnabledApps;
