import { test } from "../../lib/fixtures";
import type { TApp } from "./types";

const APP: TApp = {
  slug: "whereby",
  type: "integrations:whereby_video",
  organizerInputPlaceholder: "https://www.whereby.com/cal",
  label: "Whereby Video",
};

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test("check non-oAuth link-based conferencing apps", () => {
  test(`check conferencing app: ${APP.slug} by skipping the configure step`, async ({
    appsPage,
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();
    await appsPage.installConferencingAppSkipConfigure(APP.slug);
    await appsPage.verifyConferencingApp(APP);
  });
});

test("check non-oAuth link-based conferencing apps using the new flow", () => {
  test(`can add ${APP.slug} app and book with it`, async ({
    appsPage,
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypeIds = eventTypes
      .map((item) => item.id)
      .filter((item, index) => index < 1);
    await appsPage.installConferencingAppNewFlow(APP, eventTypeIds);
    await appsPage.verifyConferencingAppNew(APP, eventTypeIds);
  });
});
