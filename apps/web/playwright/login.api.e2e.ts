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
    expect(cookiesMap.has("next-auth.csrf-token")).toBeTruthy();
    expect(cookiesMap.has("next-auth.callback-url")).toBeTruthy();
    expect(cookiesMap.has("next-auth.session-token")).toBeTruthy();
  });
});
