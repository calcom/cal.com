import { Prisma } from "@prisma/client";

import prisma from ".";

require("dotenv").config({ path: "../../.env" });

async function createApp(
  slug: Prisma.AppCreateInput["slug"],
  /** The directory name for `/packages/app-store/[dirName]` */
  dirName: Prisma.AppCreateInput["dirName"],
  categories: Prisma.AppCreateInput["categories"],
  keys?: Prisma.AppCreateInput["keys"]
) {
  await prisma.app.upsert({
    where: { slug },
    create: { slug, dirName, categories, keys },
    update: { dirName, categories, keys },
  });
  console.log(`📲 Upserted app: '${slug}'`);
}

async function main() {
  // Calendar apps
  await createApp("apple-calendar", "applecalendar", ["calendar"]);
  await createApp("caldav-calendar", "caldavcalendar", ["calendar"]);
  try {
    const { client_secret, client_id, redirect_uris } = JSON.parse(process.env.GOOGLE_API_CREDENTIALS).web;
    await createApp("google-calendar", "googlecalendar", ["calendar"], {
      client_id,
      client_secret,
      redirect_uris,
    });
    await createApp("google-meet", "googlevideo", ["video"], { client_id, client_secret, redirect_uris });
  } catch (e) {
    if (e instanceof Error) console.error("Error adding google credentials to DB:", e.message);
  }
  if (process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET) {
    await createApp("office365-calendar", "office365calendar", ["calendar"], {
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
    });
    await createApp("msteams", "office365video", ["video"]);
  }
  // Video apps
  if (process.env.DAILY_API_KEY) {
    await createApp("dailyvideo", "dailyvideo", ["video"], {
      api_key: process.env.DAILY_API_KEY,
      scale_plan: process.env.DAILY_SCALE_PLAN,
    });
  }
  if (process.env.TANDEM_CLIENT_ID && process.env.TANDEM_CLIENT_SECRET) {
    await createApp("tandem", "tandemvideo", ["video"], {
      client_id: process.env.TANDEM_CLIENT_ID as string,
      client_secret: process.env.TANDEM_CLIENT_SECRET as string,
      base_url: (process.env.TANDEM_BASE_URL as string) || "https://tandem.chat",
    });
  }
  if (process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET) {
    await createApp("zoom", "zoomvideo", ["video"], {
      client_id: process.env.ZOOM_CLIENT_ID,
      client_secret: process.env.ZOOM_CLIENT_SECRET,
    });
  }
  await createApp("jitsi", "jitsivideo", ["video"]);
  // Other apps
  if (process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET) {
    await createApp("hubspot", "hubspotothercalendar", ["other"], {
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    });
  }
  await createApp("wipe-my-cal", "wipemycalother", ["other"]);
  if (process.env.GIPHY_API_KEY) {
    await createApp("giphy", "giphy", ["other"], {
      api_key: process.env.GIPHY_API_KEY,
    });
  }
  // Web3 apps
  await createApp("huddle01", "huddle01video", ["web3", "video"]);
  // Messaging apps
  if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET && process.env.SLACK_SIGNING_SECRET) {
    await createApp("slack", "slackmessaging", ["messaging"], {
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
    await createApp("stripe", "stripepayment", ["payment"], {
      client_id: process.env.STRIPE_CLIENT_ID,
      client_secret: process.env.STRIPE_PRIVATE_KEY,
      payment_fee_fixed: 10,
      payment_fee_percentage: 0.005,
      public_key: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
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
