import type { Prisma } from "@prisma/client";
import dotEnv from "dotenv";
import fs from "fs";
import path from "path";

import prisma from ".";

dotEnv.config({ path: "../../.env.appStore" });

export const seededForm = {
  id: "948ae412-d995-4865-875a-48302588de03",
  name: "Seeded Form - Pro",
};

async function seedAppData() {
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: seededForm.id,
    },
  });
  if (form) {
    console.log(`Skipping Routing Form - Form Seed, "Seeded Form - Pro" already exists`);
    return;
  }

  const proUser = await prisma.user.findFirst({
    where: {
      username: "pro",
    },
  });

  if (!proUser) {
    console.log(`Skipping Routing Form - Seeding - Pro User not found`);
    return;
  }

  await prisma.app_RoutingForms_Form.create({
    data: {
      id: seededForm.id,
      routes: [
        {
          id: "8a898988-89ab-4cde-b012-31823f708642",
          action: { type: "eventTypeRedirectUrl", value: "pro/30min" },
          queryValue: {
            id: "8a898988-89ab-4cde-b012-31823f708642",
            type: "group",
            children1: {
              "8988bbb8-0123-4456-b89a-b1823f70c5ff": {
                type: "rule",
                properties: {
                  field: "c4296635-9f12-47b1-8153-c3a854649182",
                  value: ["event-routing"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
          action: { type: "customPageMessage", value: "Custom Page Result" },
          queryValue: {
            id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
            type: "group",
            children1: {
              "b99b8a89-89ab-4cde-b012-31823f718ff5": {
                type: "rule",
                properties: {
                  field: "c4296635-9f12-47b1-8153-c3a854649182",
                  value: ["custom-page"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
          action: { type: "externalRedirectUrl", value: "https://google.com" },
          queryValue: {
            id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
            type: "group",
            children1: {
              "998b9b9a-0123-4456-b89a-b1823f7232b9": {
                type: "rule",
                properties: {
                  field: "c4296635-9f12-47b1-8153-c3a854649182",
                  value: ["external-redirect"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
          action: { type: "customPageMessage", value: "Multiselect chosen" },
          queryValue: {
            id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
            type: "group",
            children1: {
              "b98a8abb-cdef-4012-b456-718262343d27": {
                type: "rule",
                properties: {
                  field: "d4292635-9f12-17b1-9153-c3a854649182",
                  value: [["Option-2"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
        {
          id: "898899aa-4567-489a-bcde-f1823f708646",
          action: { type: "customPageMessage", value: "Fallback Message" },
          isFallback: true,
          queryValue: { id: "898899aa-4567-489a-bcde-f1823f708646", type: "group" },
        },
      ],
      fields: [
        { id: "c4296635-9f12-47b1-8153-c3a854649182", type: "text", label: "Test field", required: true },
        {
          id: "d4292635-9f12-17b1-9153-c3a854649182",
          type: "multiselect",
          label: "Multi Select",
          identifier: "multi",
          selectText: "Option-1\nOption-2",
          required: false,
        },
      ],
      user: {
        connect: {
          username: "pro",
        },
      },
      name: seededForm.name,
    },
  });
}

async function createApp(
  /** The App identifier in the DB also used for public page in `/apps/[slug]` */
  slug: Prisma.AppCreateInput["slug"],
  /** The directory name for `/packages/app-store/[dirName]` */
  dirName: Prisma.AppCreateInput["dirName"],
  categories: Prisma.AppCreateInput["categories"],
  /** This is used so credentials gets linked to the correct app */
  type: Prisma.CredentialCreateInput["type"],
  keys?: Prisma.AppCreateInput["keys"],
  isTemplate?: boolean
) {
  try {
    const foundApp = await prisma.app.findFirst({
      /**
       * slug and dirName both are unique and any of them can be used to find the app uniquely
       * Using both here allows us to rename(after the app has been seeded already) `slug` or `dirName` while still finding the app to apply the change on.
       * Note: dirName is legacy and it is same as slug for all apps created through App-Store Cli.
       * - Take the case there was an app with slug `myvideo` and dirName `dirName-1` and that got seeded. Now, someone wants to rename the slug to `my-video`(more readable) for the app keeping dirName same.
       *    This would make this fn to be called with slug `my-video` and dirName `dirName-1`.
       *    Now, we can find the app because dirName would still match.
       * - Similar, if someone changes dirName keeping slug same, we can find the app because slug would still match.
       * - If both dirName and slug are changed, it will be added as a new entry in the DB.
       */
      where: {
        OR: [
          {
            slug,
          },
          {
            dirName,
          },
        ],
      },
    });

    // We need to enable seeded apps as they are used in tests.
    const data = { slug, dirName, categories, keys, enabled: true };

    if (!foundApp) {
      await prisma.app.create({
        data,
      });
      console.log(`📲 Created ${isTemplate ? "template" : "app"}: '${slug}'`);
    } else {
      // We know that the app exists, so either it would have the same slug or dirName
      // Because update query can't have both slug and dirName, try to find the app to update by slug and dirName one by one
      // if there would have been a unique App.uuid, that never changes, we could have used that in update query.
      await prisma.app.update({
        where: { slug: foundApp.slug },
        data,
      });
      await prisma.app.update({
        where: { dirName: foundApp.dirName },
        data,
      });
      console.log(`📲 Updated ${isTemplate ? "template" : "app"}: '${slug}'`);
    }

    await prisma.credential.updateMany({
      // Credential should stop using type and instead use an App.uuid to refer to app deterministically. That uuid would never change even if slug/dirName changes.
      // This would allow credentials to be not orphaned when slug(appId) changes.
      where: { type },
      data: { appId: slug },
    });
  } catch (e) {
    console.log(`Could not upsert app: ${slug}. Error:`, e);
  }
}

export default async function main() {
  // Calendar apps
  await createApp("apple-calendar", "applecalendar", ["calendar"], "apple_calendar");
  await createApp("caldav-calendar", "caldavcalendar", ["calendar"], "caldav_calendar");
  try {
    const { client_secret, client_id, redirect_uris } = JSON.parse(
      process.env.GOOGLE_API_CREDENTIALS || ""
    ).web;
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
  if (
    process.env.LARK_OPEN_APP_ID &&
    process.env.LARK_OPEN_APP_SECRET &&
    process.env.LARK_OPEN_VERIFICATION_TOKEN
  ) {
    await createApp("lark-calendar", "larkcalendar", ["calendar"], "lark_calendar", {
      app_id: process.env.LARK_OPEN_APP_ID,
      app_secret: process.env.LARK_OPEN_APP_SECRET,
      open_verification_token: process.env.LARK_OPEN_VERIFICATION_TOKEN,
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
    await createApp("hubspot", "hubspot", ["other"], "hubspot_other_calendar", {
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    });
  }
  if (process.env.SALESFORCE_CONSUMER_KEY && process.env.SALESFORCE_CONSUMER_SECRET) {
    await createApp("salesforce", "salesforce", ["other"], "salesforce_other_calendar", {
      consumer_key: process.env.SALESFORCE_CONSUMER_KEY,
      consumer_secret: process.env.SALESFORCE_CONSUMER_SECRET,
    });
  }
  if (process.env.ZOHOCRM_CLIENT_ID && process.env.ZOHOCRM_CLIENT_SECRET) {
    await createApp("zohocrm", "zohocrm", ["other"], "zohocrm_other_calendar", {
      client_id: process.env.ZOHOCRM_CLIENT_ID,
      client_secret: process.env.ZOHOCRM_CLIENT_SECRET,
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
    await createApp("zapier", "zapier", ["automation"], "zapier_automation", {
      invite_link: process.env.ZAPIER_INVITE_LINK,
    });
  }

  // Web3 apps
  await createApp("huddle01", "huddle01video", ["web3", "video"], "huddle01_video");

  // Payment apps
  if (
    process.env.STRIPE_CLIENT_ID &&
    process.env.STRIPE_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.PAYMENT_FEE_FIXED &&
    process.env.PAYMENT_FEE_PERCENTAGE
  ) {
    await createApp("stripe", "stripepayment", ["payment"], "stripe_payment", {
      client_id: process.env.STRIPE_CLIENT_ID,
      client_secret: process.env.STRIPE_PRIVATE_KEY,
      payment_fee_fixed: Number(process.env.PAYMENT_FEE_FIXED),
      payment_fee_percentage: Number(process.env.PAYMENT_FEE_PERCENTAGE),
      public_key: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
  }

  const generatedApps = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-app-store.config.json"), "utf8")
  );
  for (let i = 0; i < generatedApps.length; i++) {
    const generatedApp = generatedApps[i];
    if (generatedApp.isTemplate && process.argv[2] !== "seed-templates") {
      continue;
    }
    await createApp(
      generatedApp.slug,
      generatedApp.dirName,
      generatedApp.categories,
      generatedApp.type,
      undefined,
      generatedApp.isTemplate
    );
  }

  await seedAppData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
