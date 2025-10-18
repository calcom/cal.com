import { prisma } from "@calcom/prisma";
import { getAppFromSlug } from "@calcom/app-store/utils";

export async function getInvalidCalendarCredentials(userId: number) {
  const invalidCredentials = await prisma.credential.findMany({
    where: {
      userId,
      invalid: true,
      type: {
        endsWith: "_calendar"
      }
    },
    select: {
      id: true,
      type: true,
      appId: true,
    },
  });

  const warnings = [];
  for (const credential of invalidCredentials) {
    const appId = credential.appId || credential.type;
    const appMeta = await getAppFromSlug(appId);
    const appName = appMeta ? appMeta.name : appId;
    
    warnings.push({
      message: `Your ${appName} connection has expired. Please reconnect it to ensure accurate availability.`,
      credentialId: credential.id,
      appName,
    });
  }

  return warnings;
}