import type { NextApiRequest, NextApiResponse } from "next";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { prisma } from "@calcom/prisma";
import type { AppCategories, Prisma } from "@calcom/prisma/client";

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

  const isDryRun = process.env.CRON_ENABLE_APP_SYNC !== "true";

  console.log(`🧐 Checking DB apps are in-sync with app metadata ${isDryRun ? "(dry run)" : ""}`);

  const dbApps = await prisma.app.findMany();

  for await (const dbApp of dbApps) {
    const app = await getAppWithMetadata(dbApp);
    const updates: Prisma.AppUpdateManyMutationInput = {};

    if (!app) {
      console.error(
        `💀 App ${dbApp.slug} (${dbApp.dirName}) no longer exists. ${isDryRun ? "(dry run)" : ""}`
      );
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
      console.log(
        `🔨 Updating app ${dbApp.slug} with ${Object.keys(updates).join(", ")} ${isDryRun ? "(dry run)" : ""}`
      );
      if (!isDryRun) {
        await prisma.app.update({
          where: { slug: dbApp.slug },
          data: updates,
        });
      }
    } else {
      console.log(`✅ App ${dbApp.slug} is up-to-date and correct ${isDryRun ? "(dry run)" : ""}`);
    }
  }

  res.json({ ok: true });
}
