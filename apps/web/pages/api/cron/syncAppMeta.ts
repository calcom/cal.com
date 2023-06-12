import type { NextApiRequest, NextApiResponse } from "next";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { prisma } from "@calcom/prisma";
import type { AppCategories, Prisma } from "@calcom/prisma/client";

/**
 * syncAppMeta makes sure any app metadata that has been replicated into the database
 * remains synchronised with any changes made to the app config files.
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

  console.log(`🧐 Checking DB apps are in-sync with app metadata`);

  const dbApps = await prisma.app.findMany();

  for await (const dbApp of dbApps) {
    const app = await getAppWithMetadata(dbApp);
    const updates: Prisma.AppUpdateManyMutationInput = {};

    if (!app) {
      console.error(`💀 App ${dbApp.slug} (${dbApp.dirName}) no longer exists.`);
      continue;
    }

    if (
      dbApp.categories.length !== app.categories.length ||
      !dbApp.categories.every((category) => app.categories.includes(category))
    ) {
      updates["categories"] = app.categories as AppCategories[];
    }

    if (dbApp.dirName !== app.dirName ?? app.slug) {
      updates["dirName"] = app.dirName ?? app.slug;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`🔨 Updating app ${dbApp.slug} with ${Object.keys(updates).join(", ")}`);
      await prisma.app.update({
        where: { slug: dbApp.slug },
        data: updates,
      });
    } else {
      console.log(`✅ App ${dbApp.slug} is up-to-date and correct`);
    }
  }

  res.json({ ok: true });
}
