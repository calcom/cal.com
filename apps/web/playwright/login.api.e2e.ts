import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Login with api request", () => {
  test("context request will share cookie storage with its browser context", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    const contextCookies = await page.context().cookies();
    const cookiesMap = new Map(contextCookies.map(({ name, value }) => [name, value]));

    // The browser context will already contain all the cookies from the API response.
    const expectedCookies = ["next-auth.csrf-token", "next-auth.callback-url", "next-auth.session-token"];

    expectedCookies.forEach((cookie) => {
      expect(cookiesMap.has(cookie)).toBeTruthy();
    });
  });
});
