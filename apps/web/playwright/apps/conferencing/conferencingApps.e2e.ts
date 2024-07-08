/* eslint-disable playwright/no-conditional-in-test */
import { test } from "../../lib/fixtures";

export type TApp = {
  slug: string;
  type: string;
  organizerInputPlaceholder?: string;
  label: string;
};
type TAllApps = {
  [key: string]: TApp;
};

const ALL_APPS: TAllApps = {
  around: {
    slug: "around",
    type: "integrations:around_video",
    organizerInputPlaceholder: "https://www.around.co/rick",
    label: "Around Video",
  },
  campfire: {
    slug: "campfire",
    type: "integrations:campfire_video",
    organizerInputPlaceholder: "https://party.campfire.to/your-team",
    label: "Campfire",
  },
  demodesk: {
    slug: "demodesk",
    type: "integrations:demodesk_video",
    organizerInputPlaceholder: "https://demodesk.com/meet/mylink",
    label: "Demodesk",
  },
  discord: {
    slug: "discord",
    type: "integrations:discord_video",
    organizerInputPlaceholder: "https://discord.gg/420gg69",
    label: "Discord",
  },
  eightxeight: {
    slug: "eightxeight",
    type: "integrations:eightxeight_video",
    organizerInputPlaceholder: "https://8x8.vc/company",
    label: "8x8",
  },
  "element-call": {
    slug: "element-call",
    type: "integrations:element-call_video",
    organizerInputPlaceholder: "https://call.element.io/",
    label: "Element Call",
  },
  facetime: {
    slug: "facetime",
    type: "integrations:facetime_video",
    organizerInputPlaceholder: "https://facetime.apple.com/join=#v=1&p=zU9w7QzuEe",
    label: "Facetime",
  },
  mirotalk: {
    slug: "mirotalk",
    type: "integrations:mirotalk_video",
    organizerInputPlaceholder: "https://p2p.mirotalk.com/join/80085ShinyPhone",
    label: "Mirotalk",
  },
  ping: {
    slug: "ping",
    type: "integrations:ping_video",
    organizerInputPlaceholder: "https://www.ping.gg/call/theo",
    label: "Ping.gg",
  },
  riverside: {
    slug: "riverside",
    type: "integrations:riverside_video",
    organizerInputPlaceholder: "https://riverside.fm/studio/abc123",
    label: "Riverside Video",
  },
  roam: {
    slug: "roam",
    type: "integrations:roam_video",
    organizerInputPlaceholder: "https://ro.am/r/#/p/yHwFBQrRTMuptqKYo_wu8A/huzRiHnR-np4RGYKV-c0pQ",
    label: "Roam",
  },
  salesroom: {
    slug: "salesroom",
    type: "integrations:salesroom_video",
    organizerInputPlaceholder: "https://user.sr.chat",
    label: "Salesroom",
  },
  sirius_video: {
    slug: "sirius_video",
    type: "integrations:sirius_video_video",
    organizerInputPlaceholder: "https://sirius.video/sebastian",
    label: "Sirius Video",
  },
  whereby: {
    slug: "whereby",
    type: "integrations:whereby_video",
    label: "Whereby Video",
    organizerInputPlaceholder: "https://www.whereby.com/cal",
  },
};

const ALL_APPS_ARRAY: TApp[] = Object.values(ALL_APPS);
/**
 * @todo add tests for
 * shimmervideo
 * sylapsvideo
 * googlevideo
 * huddle
 * jelly
 * jistivideo
 * office365video
 * mirotalk
 * tandemvideo
 * webex
 * zoomvideo
 */

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("check non-oAuth link-based conferencing apps ", () => {
  test("check conferencing apps by skipping the configure step", async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    for (let index = 0; index < ALL_APPS_ARRAY.length; index++) {
      const app = ALL_APPS_ARRAY[index];
      await page.goto("apps/categories/conferencing");
      await appsPage.installConferencingAppSkipConfigure(app.slug);
      await appsPage.verifyConferencingApp(app, index);
    }
  });
  test.describe("check non-oAuth link-based conferencing apps using the new flow", () => {
    test("can add around app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["around"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add campfire app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["campfire"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add demodesk app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["demodesk"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add discord app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["discord"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add eightxeight app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["eightxeight"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add element-call app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["element-call"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add facetime app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["facetime"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add mirotalk app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["mirotalk"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add ping app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["ping"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add riverside app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["riverside"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add roam app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["roam"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add salesroom app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["salesroom"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add sirius_video app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["sirius_video"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });

    test("can add whereby app and book with it", async ({ appsPage, page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      const eventTypes = await user.getUserEventsAsOwner();
      const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 2);
      const app = ALL_APPS["whereby"];
      await appsPage.installConferencingAppNewFlow(app, eventTypeIds);
      await appsPage.verifyConferencingAppNew(app, eventTypeIds);
    });
  });
});
