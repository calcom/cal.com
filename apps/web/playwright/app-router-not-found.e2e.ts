import { expectPageToBeNotFound } from "playwright/lib/testUtils";

import { test } from "./lib/fixtures";

test.describe("App Router - error handling", () => {
  test("Not-existing pages must render App Router's not-found error page", async ({ page }) => {
    await expectPageToBeNotFound({ page, url: "/123491234" });
    await expectPageToBeNotFound({ page, url: "/team/123491234" });
    await expectPageToBeNotFound({ page, url: "/org/123491234" });
    await expectPageToBeNotFound({ page, url: "/insights/123491234" });
    await expectPageToBeNotFound({ page, url: "/login/123491234" });
  });
});
