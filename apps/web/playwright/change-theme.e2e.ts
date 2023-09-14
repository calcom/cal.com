import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Change Theme Test", () => {
  test("change theme to dark", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    await page.goto("/settings/my-account/appearance");

    await page.waitForLoadState("networkidle");
    //Click the "Dark" theme label
    await page.click('[data-testid="theme-dark"]');
    //Click the update button
    await page.click('[data-testid="update-theme-btn"]');
    //Wait for the toast to appear
    const toast = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast).toBeTruthy();
    //Go to the profile page and check if the theme is dark
    await page.goto(`/${pro.username}`);
    const darkModeClass = await page.getAttribute("html", "class");
    expect(darkModeClass).toContain("dark");
  });

  test("change theme to light", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    await page.goto("/settings/my-account/appearance");

    await page.waitForLoadState("networkidle");
    //Click the "Light" theme label
    await page.click('[data-testid="theme-light"]');
    //Click the update theme button
    await page.click('[data-testid="update-theme-btn"]');
    //Wait for the toast to appear
    const toast = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast).toBeTruthy();
    //Go to the profile page and check if the theme is light
    await page.goto(`/${pro.username}`);
    const darkModeClass = await page.getAttribute("html", "class");
    expect(darkModeClass).toContain("light");
  });
});
