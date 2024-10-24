import { test } from "../../lib/fixtures";

export type TApp = {
  slug: string;
  type: string;
  organizerInputPlaceholder?: string;
  label: string;
};

const APP: TApp = {
  slug: "around",
  type: "integrations:around_video",
  organizerInputPlaceholder: "https://www.around.co/rick",
  label: "Around Video",
};

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("check non-oAuth link-based conferencing apps", () => {
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

test.describe("check non-oAuth link-based conferencing apps using the new flow", () => {
  test(`can add ${APP.slug} app and book with it`, async ({ appsPage, page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventTypes = await user.getUserEventsAsOwner();
    const eventTypeIds = eventTypes.map((item) => item.id).filter((item, index) => index < 1);
    await appsPage.installConferencingAppNewFlow(APP, eventTypeIds);
    await appsPage.verifyConferencingAppNew(APP, eventTypeIds);
  });
});
