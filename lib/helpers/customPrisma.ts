import { hash } from "bcryptjs";
import cache from "memory-cache";
import { NextMiddleware } from "next-api-middleware";

import { PRISMA_CLIENT_CACHING_TIME } from "@calcom/api/lib/constants";
// import prismaAdmin from "@calcom/console/modules/common/utils/prisma";
import { asStringOrUndefined } from "@calcom/lib/asStringOrNull";
import { CONSOLE_URL } from "@calcom/lib/constants";
import { prisma, customPrisma } from "@calcom/prisma";

// This replaces the prisma client for the cusotm one if the key is valid
export const customPrismaClient: NextMiddleware = async (req, res, next) => {
  const {
    query: { key },
  }: { query: { key?: string } } = req;
  // If no custom api Id is provided, attach to request the regular cal.com prisma client.
  if (!key) {
    req.prisma = prisma;
    await next();
  } else {
    const id = asStringOrUndefined(key);

    // If we have a key, we check if it is valid.
    // const deployment = await prismaAdmin.deployment.findUnique({
    //   where: { key },
    // });
    const databaseUrl = await fetch(
      `${process.env.NEXT_PUBLIC_CONSOLE_URL || CONSOLE_URL}/api/deployments/database?key=${id}`
    )
      .then((res) => res.json())
      .then((res) => res.databaseUrl);

    if (!databaseUrl) {
      res.status(400).json({ error: "no databaseUrl set up at your instance yet" });
      return;
    }
    const hashedUrl = await hash(databaseUrl, 12);

    const cachedPrisma = cache.get(hashedUrl);

    if (!cachedPrisma) {
      cache.put(
        hashedUrl,
        customPrisma({ datasources: { db: { url: databaseUrl } } }),
        PRISMA_CLIENT_CACHING_TIME // Cache the prisma client for 24 hours
      );
    }
    req.prisma = customPrisma({ datasources: { db: { url: databaseUrl } } });
  }
  await next();
};
