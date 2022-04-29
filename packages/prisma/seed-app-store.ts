import { Prisma } from "@prisma/client";

import prisma from ".";

require("dotenv").config({ path: "../../.env" });

async function createApp(
  slug: Prisma.AppCreateInput["slug"],
  categories: Prisma.AppCreateInput["categories"],
  keys?: Prisma.AppCreateInput["keys"]
) {
  await prisma.app.create({ data: { slug, categories, keys } });
  console.log(`📲 Created app: '${slug}'`);
}

async function main() {
  // Calendar apps
  await createApp("apple-calendar", ["CALENDAR"]);
  await createApp("caldav-calendar", ["CALENDAR"]);
  try {
    const { client_secret, client_id, redirect_uris } = JSON.parse(process.env.GOOGLE_API_CREDENTIALS).web;
    await createApp("google-calendar", ["CALENDAR"], { client_id, client_secret, redirect_uris });
  } catch (e) {
    console.error("Error adding google credentials to DB:", e);
  }
  if (process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET) {
    await createApp("office365-calendar", ["CALENDAR"], {
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
    });
  }
  // Video apps
  if (process.env.DAILY_API_KEY && process.env.DAILY_SCALE_PLAN) {
    await createApp("dailyvideo", ["VIDEO"], {
      api_key: process.env.DAILY_API_KEY,
      scale_plan: process.env.DAILY_SCALE_PLAN,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
