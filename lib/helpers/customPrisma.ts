import { hash } from "bcryptjs";
import cache from "memory-cache";
import { NextMiddleware } from "next-api-middleware";

import { CONSOLE_URL } from "@calcom/lib/constants";
import { prisma, customPrisma } from "@calcom/prisma";

import { PRISMA_CLIENT_CACHING_TIME } from "../../lib/constants";

// This replaces the prisma client for the cusotm one if the key is valid
export const customPrismaClient: NextMiddleware = async (req, res, next) => {
  const {
    query: { key },
  }: { query: { key?: string } } = req;
  // If no custom api Id is provided, attach to request the regular cal.com prisma client.
  if (!key) {
    req.prisma = prisma;
    await next();
    return;
  }

  // If we have a key, we check if the deployment matching the key, has a databaseUrl value set.
  const databaseUrl = await fetch(
    `${process.env.NEXT_PUBLIC_CONSOLE_URL || CONSOLE_URL}/api/deployments/database?key=${key}`
  )
    .then((res) => res.json())
    .then((res) => res.databaseUrl);

  if (!databaseUrl) {
    res.status(400).json({ error: "no databaseUrl set up at your instance yet" });
    return;
  }
  // FIXME: Add some checks for the databaseUrl to make sure it is valid. (e.g. not a localhost)
  const hashedUrl = await hash(databaseUrl, 12);

  const cachedPrisma = cache.get(hashedUrl);
  /* We cache each cusotm prisma client for 24h to avoid too many requests to the database. */
  if (!cachedPrisma) {
    cache.put(
      hashedUrl,
      customPrisma({ datasources: { db: { url: databaseUrl } } }),
      PRISMA_CLIENT_CACHING_TIME // Cache the prisma client for 24 hours
    );
  }
  req.prisma = customPrisma({ datasources: { db: { url: databaseUrl } } });
  /* @note:
    In order to skip verifyApiKey for customPrisma requests, 
    we pass isAdmin true, and userId 0, if we detect them later, 
    we skip verifyApiKey logic and pass onto next middleware instead.
     */
  req.isAdmin = true;
  req.isCustomPrisma = true;

  await next();
};
