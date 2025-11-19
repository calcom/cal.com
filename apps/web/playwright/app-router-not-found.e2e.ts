import { expectPageToBeNotFound } from "playwright/lib/testUtils";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("App Router - error handling", () => {
  test("404s must render App Router's not-found page regardless of whether pages router or app router is used", async ({
    page,
  }) => {
    await expectPageToBeNotFound({ page, url: "/123491234" });
    await expectPageToBeNotFound({ page, url: "/team/123491234" });
    await expectPageToBeNotFound({ page, url: "/org/123491234" });
    await expectPageToBeNotFound({ page, url: "/insights/123491234" });
    await expectPageToBeNotFound({ page, url: "/login/123491234" });
  });
});
