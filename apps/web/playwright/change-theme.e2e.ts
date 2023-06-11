import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Change Theme Test", () => {
  test("change theme to dark", async ({ page, users }) => {
    const pro = await users.create();
    await pro.login();

    await page.goto("/settings/my-account/appearance");

    await page.waitForLoadState("networkidle");
    //Find the theme button which has label "Dark"
    const $themeButton = page.getByText("Dark", { exact: true });
    await $themeButton.click();
    //Find the update button
    const $updateButton = page.locator("text=Update");
    await $updateButton.click();
    //Wait for the toast to appear
    const toast = await page.waitForSelector("div[class*='data-testid-toast-success']");
    expect(toast).toBeTruthy();
    //Go to the profile page and check if the theme is dark
    await page.goto(`/${pro.username}`);
    const darkModeClass = await page.getAttribute("html", "class");
    expect(darkModeClass).toContain("dark");
  });

  test("change theme to light", async ({ page, users }) => {
    const pro = await users.create();
    await pro.login();

    await page.goto("/settings/my-account/appearance");

    await page.waitForLoadState("networkidle");
    //Find the theme button which has label "Light"
    const $themeButton = page.getByText("Light", { exact: true });
    await $themeButton.click();
    //Find the update button
    const $updateButton = page.locator("text=Update");
    await $updateButton.click();
    //Wait for the toast to appear
    const toast = await page.waitForSelector("div[class*='data-testid-toast-success']");
    expect(toast).toBeTruthy();
    //Go to the profile page and check if the theme is light
    await page.goto(`/${pro.username}`);
    const darkModeClass = await page.getAttribute("html", "class");
    expect(darkModeClass).toContain("light");
  });
});
