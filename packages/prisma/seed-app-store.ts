import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

import prisma from ".";

require("dotenv").config({ path: "../../.env.appStore" });

async function createApp(
  /** The App identifier in the DB also used for public page in `/apps/[slug]` */
  slug: Prisma.AppCreateInput["slug"],
  /** The directory name for `/packages/app-store/[dirName]` */
  dirName: Prisma.AppCreateInput["dirName"],
  categories: Prisma.AppCreateInput["categories"],
  /** This is used so credentials gets linked to the correct app */
  type: Prisma.CredentialCreateInput["type"],
  keys?: Prisma.AppCreateInput["keys"]
) {
  await prisma.app.upsert({
    where: { slug },
    create: { slug, dirName, categories, keys },
    update: { dirName, categories, keys },
  });
  await prisma.credential.updateMany({
    where: { type },
    data: { appId: slug },
  });
  console.log(`📲 Upserted app: '${slug}'`);
}

async function main() {
  // Calendar apps
  await createApp("apple-calendar", "applecalendar", ["calendar"], "apple_calendar");
  await createApp("caldav-calendar", "caldavcalendar", ["calendar"], "caldav_calendar");
  await createApp("exchange2013-calendar", "exchange2013calendar", ["calendar"], "exchange2013_calendar");
  await createApp("exchange2016-calendar", "exchange2016calendar", ["calendar"], "exchange2016_calendar");
  try {
    const { client_secret, client_id, redirect_uris } = JSON.parse(process.env.GOOGLE_API_CREDENTIALS).web;
    await createApp("google-calendar", "googlecalendar", ["calendar"], "google_calendar", {
      client_id,
      client_secret,
      redirect_uris,
    });
    await createApp("google-meet", "googlevideo", ["video"], "google_video", {
      client_id,
      client_secret,
      redirect_uris,
    });
  } catch (e) {
    if (e instanceof Error) console.error("Error adding google credentials to DB:", e.message);
  }
  if (process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET) {
    await createApp("office365-calendar", "office365calendar", ["calendar"], "office365_calendar", {
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
    });
    await createApp("msteams", "office365video", ["video"], "office365_video", {
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
    });
  }
  // Video apps
  if (process.env.DAILY_API_KEY) {
    await createApp("daily-video", "dailyvideo", ["video"], "daily_video", {
      api_key: process.env.DAILY_API_KEY,
      scale_plan: process.env.DAILY_SCALE_PLAN,
    });
  }
  if (process.env.TANDEM_CLIENT_ID && process.env.TANDEM_CLIENT_SECRET) {
    await createApp("tandem", "tandemvideo", ["video"], "tandem_video", {
      client_id: process.env.TANDEM_CLIENT_ID as string,
      client_secret: process.env.TANDEM_CLIENT_SECRET as string,
      base_url: (process.env.TANDEM_BASE_URL as string) || "https://tandem.chat",
    });
  }
  if (process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET) {
    await createApp("zoom", "zoomvideo", ["video"], "zoom_video", {
      client_id: process.env.ZOOM_CLIENT_ID,
      client_secret: process.env.ZOOM_CLIENT_SECRET,
    });
  }
  await createApp("jitsi", "jitsivideo", ["video"], "jitsi_video");
  // Other apps
  if (process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET) {
    await createApp("hubspot", "hubspotothercalendar", ["other"], "hubspot_other_calendar", {
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    });
  }
  await createApp("wipe-my-cal", "wipemycalother", ["other"], "wipemycal_other");
  if (process.env.GIPHY_API_KEY) {
    await createApp("giphy", "giphy", ["other"], "giphy_other", {
      api_key: process.env.GIPHY_API_KEY,
    });
  }

  if (process.env.VITAL_API_KEY && process.env.VITAL_WEBHOOK_SECRET) {
    await createApp("vital-automation", "vital", ["other"], "vital_other", {
      mode: process.env.VITAL_DEVELOPMENT_MODE || "sandbox",
      region: process.env.VITAL_REGION || "us",
      api_key: process.env.VITAL_API_KEY,
      webhook_secret: process.env.VITAL_WEBHOOK_SECRET,
    });
  }

  if (process.env.ZAPIER_INVITE_LINK) {
    await createApp("zapier", "zapier", ["other"], "zapier_other", {
      invite_link: process.env.ZAPIER_INVITE_LINK,
    });
  }

  // Web3 apps
  await createApp("huddle01", "huddle01video", ["web3", "video"], "huddle01_video");
  await createApp("metamask", "metamask", ["web3"], "metamask_web3");
  // Messaging apps
  if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET && process.env.SLACK_SIGNING_SECRET) {
    await createApp("slack", "slackmessaging", ["messaging"], "slack_messaging", {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      signing_secret: process.env.SLACK_SIGNING_SECRET,
    });
  }
  // Payment apps
  if (
    process.env.STRIPE_CLIENT_ID &&
    process.env.STRIPE_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET
  ) {
    await createApp("stripe", "stripepayment", ["payment"], "stripe_payment", {
      client_id: process.env.STRIPE_CLIENT_ID,
      client_secret: process.env.STRIPE_PRIVATE_KEY,
      payment_fee_fixed: 10,
      payment_fee_percentage: 0.005,
      public_key: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
  }

  const generatedApps = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-app-store.config.json"), "utf8")
  );
  for (let i = 0; i < generatedApps.length; i++) {
    const generatedApp = generatedApps[i];
    await createApp(generatedApp.slug, generatedApp.dirName, generatedApp.categories, generatedApp.type);
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
