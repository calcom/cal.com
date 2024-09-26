import type { NextApiRequest, NextApiResponse } from "next";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { AppCategories, Prisma } from "@calcom/prisma/client";

const isDryRun = process.env.CRON_ENABLE_APP_SYNC !== "true";
const log = logger.getSubLogger({
  prefix: ["[api/cron/syncAppMeta]", ...(isDryRun ? ["(dry-run)"] : [])],
});

/**
 * syncAppMeta makes sure any app metadata that has been replicated into the database
 * remains synchronized with any changes made to the app config files.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  log.info(`🧐 Checking DB apps are in-sync with app metadata`);

  const dbApps = await prisma.app.findMany();

  for await (const dbApp of dbApps) {
    const app = await getAppWithMetadata(dbApp);
    const updates: Prisma.AppUpdateManyMutationInput = {};

    if (!app) {
      log.warn(`💀 App ${dbApp.slug} (${dbApp.dirName}) no longer exists.`);
      continue;
    }

    // Check for any changes in the app categories (tolerates changes in ordering)
    if (
      dbApp.categories.length !== app.categories.length ||
      !dbApp.categories.every((category) => app.categories.includes(category))
    ) {
      updates["categories"] = app.categories as AppCategories[];
    }

    if (dbApp.dirName !== (app.dirName ?? app.slug)) {
      updates["dirName"] = app.dirName ?? app.slug;
    }

    if (Object.keys(updates).length > 0) {
      log.info(`🔨 Updating app ${dbApp.slug} with ${Object.keys(updates).join(", ")}`);
      if (!isDryRun) {
        await prisma.app.update({
          where: { slug: dbApp.slug },
          data: updates,
        });
      }
    } else {
      log.info(`✅ App ${dbApp.slug} is up-to-date and correct`);
    }
  }

  res.json({ ok: true });
}
