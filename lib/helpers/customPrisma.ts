import { hash } from "bcryptjs";
import cache from "memory-cache";
import { NextMiddleware } from "next-api-middleware";

import { prismaAdmin } from "@calcom/console/modules/common/utils/prisma";
import { asStringOrUndefined } from "@calcom/lib/asStringOrNull";
import { PRISMA_CLIENT_CACHING_TIME } from "@calcom/lib/constants";
import { prisma, customPrisma } from "@calcom/prisma";

// This replaces the prisma client for the cusotm one if the customCredentialsId is valid
export const customPrismaClient: NextMiddleware = async (req, res, next) => {
  const {
    query: { customCredentialsId },
  } = req;
  // If no custom api Id is provided, attach to request the regular cal.com prisma client.
  if (!customCredentialsId) {
    req.prisma = prisma;
    await next();
  } else {
    const id = asStringOrUndefined(customCredentialsId);

    // If we have a customCredentialsId, we check if it is valid.
    const dataCredentials = await prismaAdmin.dataCredentials.findUnique({
      where: { id },
    });
    if (!dataCredentials) {
      res.status(400).json({ error: "Invalid custom credentials id" });
      return;
    }
    const credentials = dataCredentials?.credentials;
    const hashedUrl = await hash(credentials, 12);

    const cachedPrisma = cache.get(hashedUrl);

    if (!cachedPrisma) {
      cache.put(
        hashedUrl,
        customPrisma({ datasources: { db: { url: credentials } } }),
        PRISMA_CLIENT_CACHING_TIME // Cache the prisma client for 24 hours
      );
    }
    req.prisma = cachedPrisma;
  }
  await next();
};
