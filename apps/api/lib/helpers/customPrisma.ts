import type { NextMiddleware } from "next-api-middleware";

import { CONSOLE_URL } from "@calcom/lib/constants";
import { customPrisma } from "@calcom/prisma";

const LOCAL_CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL || CONSOLE_URL;

// This replaces the prisma client for the custom one if the key is valid
export const customPrismaClient: NextMiddleware = async (req, res, next) => {
  const {
    query: { key },
  } = req;
  // If no custom api Id is provided, attach to request the regular cal.com prisma client.
  if (!key) {
    req.prisma = customPrisma();
    await next();
    return;
  }

  // If we have a key, we check if the deployment matching the key, has a databaseUrl value set.
  const databaseUrl = await fetch(`${LOCAL_CONSOLE_URL}/api/deployments/database?key=${key}`)
    .then((res) => res.json())
    .then((res) => res.databaseUrl);

  if (!databaseUrl) {
    res.status(400).json({ error: "no databaseUrl set up at your instance yet" });
    return;
  }
  req.prisma = customPrisma({ datasources: { db: { url: databaseUrl } } });
  /* @note:
    In order to skip verifyApiKey for customPrisma requests, 
    we pass isAdmin true, and userId 0, if we detect them later, 
    we skip verifyApiKey logic and pass onto next middleware instead.
     */
  req.isAdmin = true;
  req.isCustomPrisma = true;
  // We don't need the key from here and on. Prevents unrecognized key errors.
  delete req.query.key;
  await next();
  await req.prisma.$disconnect();
  // @ts-expect-error testing
  delete req.prisma;
};
