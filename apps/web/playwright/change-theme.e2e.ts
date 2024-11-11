import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Change App Theme Test", () => {
  test("change app theme to dark", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();
    await page.goto("/settings/my-account/appearance");
    await page.click('[data-testid="appTheme-dark"]');
    await page.click('[data-testid="update-app-theme-btn"]');

    const toast = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast).toBeTruthy();

    const darkModeClass = await page.getAttribute("html", "class");
    expect(darkModeClass).toContain("dark");

    const themeValue = await page.evaluate(() => localStorage.getItem("app-theme"));
    expect(themeValue).toBe("dark");
  });

  test("change app theme to light", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();
    await page.goto("/settings/my-account/appearance");
    await page.click('[data-testid="appTheme-light"]');
    await page.click('[data-testid="update-app-theme-btn"]');

    const toast = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast).toBeTruthy();

    const darkModeClass = await page.getAttribute("html", "class");
    expect(darkModeClass).toContain("light");

    const themeValue = await page.evaluate(() => localStorage.getItem("app-theme"));
    expect(themeValue).toBe("light");
  });

  test("change app theme to system", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    await page.goto("/settings/my-account/appearance");
    await page.click('[data-testid="appTheme-light"]');
    await page.click('[data-testid="update-app-theme-btn"]');
    const toast1 = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast1).toBeTruthy();

    await page.click('[data-testid="appTheme-system"]');
    await page.click('[data-testid="update-app-theme-btn"]');
    const toast2 = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast2).toBeTruthy();

    await page.waitForTimeout(3000);
    const themeValue = await page.evaluate(() => localStorage.getItem("app-theme"));
    expect(themeValue).toBe("system");

    const systemTheme = await page.evaluate(() => {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });
    expect(await page.getAttribute("html", "class")).toContain(systemTheme);
  });
});

test.describe("Change Booking Page Theme Test", () => {
  test("change booking page theme to dark", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    await page.goto("/settings/my-account/appearance");

    //Click the "Dark" theme label
    await page.click('[data-testid="theme-dark"]');
    //Click the update button
    await page.click('[data-testid="update-theme-btn"]');
    //Wait for the toast to appear
    const toast = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast).toBeTruthy();
    //Go to the profile page and check if the theme is dark
    await page.goto(`/${pro.username}`);
    const htmlClass = await page.getAttribute("html", "class");
    expect(htmlClass).toContain("dark");
  });

  test("change booking page theme to light", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    await page.goto("/settings/my-account/appearance");

    //Click the "Light" theme label
    await page.click('[data-testid="theme-light"]');
    //Click the update theme button
    await page.click('[data-testid="update-theme-btn"]');
    //Wait for the toast to appear
    const toast = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast).toBeTruthy();
    //Go to the profile page and check if the theme is light
    await page.goto(`/${pro.username}`);
    const htmlClass = await page.getAttribute("html", "class");
    expect(htmlClass).toContain("light");
  });

  test("change booking page theme to system", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    await page.goto("/settings/my-account/appearance");

    await page.click('[data-testid="theme-light"]');
    await page.click('[data-testid="update-theme-btn"]');
    const toast1 = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast1).toBeTruthy();

    await page.click('[data-testid="theme-system"]');
    await page.click('[data-testid="update-theme-btn"]');
    const toast2 = await page.waitForSelector('[data-testid="toast-success"]');
    expect(toast2).toBeTruthy();
    await page.goto(`/${pro.username}`);

    const systemTheme = await page.evaluate(() => {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });

    expect(await page.getAttribute("html", "class")).toContain(systemTheme);
  });
});
