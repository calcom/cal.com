/* eslint-disable playwright/no-conditional-in-test */
import { expect } from "@playwright/test";

import { test } from "../../lib/fixtures";
import { gotoBookingPage, bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "../../lib/testUtils";

export type TApp = {
  slug: string;
  type: string;
  organizerInputPlaceholder?: string;
  label: string;
};

const ALL_APPS: TApp[] = [
  {
    slug: "around",
    type: "integrations:around_video",
    organizerInputPlaceholder: "https://www.around.co/rick",
    label: "Around Video",
  },
  {
    slug: "campfire",
    type: "integrations:campfire_video",
    organizerInputPlaceholder: "https://party.campfire.to/your-team",
    label: "Campfire",
  },
  {
    slug: "demodesk",
    type: "integrations:demodesk_video",
    organizerInputPlaceholder: "https://demodesk.com/meet/mylink",
    label: "Demodesk",
  },
  {
    slug: "discord",
    type: "integrations:discord_video",
    organizerInputPlaceholder: "https://discord.gg/420gg69",
    label: "Discord",
  },
  {
    slug: "eightxeight",
    type: "integrations:eightxeight_video",
    organizerInputPlaceholder: "https://8x8.vc/company",
    label: "8x8",
  },
  {
    slug: "element-call",
    type: "integrations:element-call_video",
    organizerInputPlaceholder: "https://call.element.io/",
    label: "Element Call",
  },
  {
    slug: "facetime",
    type: "integrations:facetime_video",
    organizerInputPlaceholder: "https://facetime.apple.com/join=#v=1&p=zU9w7QzuEe",
    label: "Facetime",
  },
  {
    slug: "mirotalk",
    type: "integrations:mirotalk_video",
    organizerInputPlaceholder: "https://p2p.mirotalk.com/join/80085ShinyPhone",
    label: "Mirotalk",
  },

  {
    slug: "ping",
    type: "integrations:ping_video",
    organizerInputPlaceholder: "https://www.ping.gg/call/theo",
    label: "Ping.gg",
  },
  {
    slug: "riverside",
    type: "integrations:riverside_video",
    organizerInputPlaceholder: "https://riverside.fm/studio/abc123",
    label: "Riverside Video",
  },
  {
    slug: "roam",
    type: "integrations:roam_video",
    organizerInputPlaceholder: "https://ro.am/r/#/p/yHwFBQrRTMuptqKYo_wu8A/huzRiHnR-np4RGYKV-c0pQ",
    label: "Roam",
  },
  {
    slug: "salesroom",
    type: "integrations:salesroom_video",
    organizerInputPlaceholder: "https://user.sr.chat",
    label: "Salesroom",
  },
  {
    slug: "shimmervideo",
    type: "integrations:shimmer_video",
    label: "Shimmer Video",
  },
  {
    slug: "sirius_video",
    type: "integrations:sirius_video_video",
    organizerInputPlaceholder: "https://sirius.video/sebastian",
    label: "Sirius Video",
  },
  {
    slug: "sylapsvideo",
    type: "integrations:sylaps_video",
    label: "Sylaps",
  },
  {
    slug: "whereby",
    type: "integrations:whereby_video",
    label: "Whereby Video",
    organizerInputPlaceholder: "https://www.whereby.com/cal",
  },
];

test.afterEach(({ users }) => users.deleteAll());

test.describe("check non-oAuth conferencing apps ", () => {
  test("check non-oAuth conferencing apps by skipping the configure step", async ({
    appsPage,
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();
    for (let index = 0; index < ALL_APPS.length; index++) {
      const app = ALL_APPS[index];
      await page.goto("apps/categories/conferencing");
      await appsPage.installConferencingAppSkipConfigure(app.slug);
      await appsPage.verifyConferencingApp(app, index);
    }
  });

  test("check non-oAuth conferencing apps using the new flow", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);

    for (let index = 0; index < ALL_APPS.length; index++) {
      const app = ALL_APPS[index];
      await page.goto("apps/categories/conferencing");
      await page.getByTestId(`app-store-app-card-${app.slug}`).click();
      await page.getByTestId("install-app-button").click();
      await page.waitForURL(`apps/installation/event-types?slug=${app.slug}`);

      for (const id of eventTypeIds) {
        await page.click(`[data-testid="select-event-type-${id}"]`);
      }
      await page.click(`[data-testid="save-event-types"]`);
      for (let eindex = 0; eindex < eventTypeIds.length; eindex++) {
        if (app.organizerInputPlaceholder) {
          await page
            .getByTestId(`${app.type}-location-input`)
            .nth(eindex)
            .fill(app.organizerInputPlaceholder);
        }
      }
      await page.click(`[data-testid="configure-step-save"]`);
      await page.waitForURL("/event-types");

      for (const id of eventTypeIds) {
        await page.goto(`/event-types/${id}`);
        await page.waitForLoadState("networkidle");
        await gotoBookingPage(page);
        await selectFirstAvailableTimeSlotNextMonth(page);
        if (index > 0) {
          await page.getByLabel(app.label).click();
        }
        await bookTimeSlot(page, { name: `Test Testson ${index}`, email: `test${index}@example.com` });

        await page.waitForLoadState("networkidle");

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator("[data-testid=where] ")).toContainText(app.label);
      }
    }
  });
});
