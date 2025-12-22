import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

// IMPORTANT: we do NOT load different translations based on URL locale
// We load different translations based on the browser locale or Cal.com User settings
// This test suite is just to make sure that the routing works correctly
test.describe("Locale-specific pages must not 404", () => {
  for (const locale of ["en", "fr"]) {
    test.describe(`/${locale}/* pages`, () => {
      test(`/${locale}/login shouldn't 404`, async ({ page }) => {
        const response = await page.goto(`/${locale}/login`);
        expect(response?.status()).not.toBe(404);
        await expect(page.getByTestId("login-form")).toBeVisible();
      });

      test(`/${locale}/auth/login shouldn't 404`, async ({ page }) => {
        const response = await page.goto(`/${locale}/auth/login`);
        expect(response?.status()).not.toBe(404);
        await expect(page.getByTestId("login-form")).toBeVisible();
      });

      test(`/${locale}/[user] page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        const response = await page.goto(`/${locale}/${user.username}`);
        expect(response?.status()).not.toBe(404);
        await expect(page.getByTestId("event-types")).toBeVisible();
      });

      test(`/${locale}/[user]/[type] page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        const response = await page.goto(`/${locale}/${user.username}/30-min`);
        expect(response?.status()).not.toBe(404);
        await expect(page.getByTestId("booker-container")).toBeVisible();
      });

      test(`/${locale}/event-types page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        await user.apiLogin();
        const response = await page.goto(`/${locale}/event-types`);
        expect(response?.status()).not.toBe(404);
        await expect(
          page.locator("text=Create events to share for people to book on your calendar.")
        ).toBeVisible();
      });

      test(`/${locale}/availability page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        await user.apiLogin();
        const response = await page.goto(`/${locale}/availability`);
        expect(response?.status()).not.toBe(404);
        await expect(page.locator("text=Configure times when you are available for bookings.")).toBeVisible();
      });

      test(`/${locale}/bookings/upcoming page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        await user.apiLogin();
        const response = await page.goto(`/${locale}/bookings/upcoming`);
        expect(response?.status()).not.toBe(404);
        await expect(page.getByRole("heading", { name: "No upcoming bookings" })).toBeVisible();
      });

      test(`/${locale}/teams page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        await user.apiLogin();
        const response = await page.goto(`/${locale}/teams`);
        expect(response?.status()).not.toBe(404);
        await expect(
          page.locator("text=Create and manage teams to use collaborative features.")
        ).toBeVisible();
      });

      test(`/${locale}/routing page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        await user.apiLogin();
        const response = await page.goto(`/${locale}/routing`);
        expect(response?.status()).not.toBe(404);
        await expect(
          page.locator("text=Create forms to direct attendees to the correct destinations")
        ).toBeVisible();
      });

      test(`/${locale}/insights page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        await user.apiLogin();
        const response = await page.goto(`/${locale}/insights`);
        expect(response?.status()).not.toBe(404);
        await expect(page.locator("text=View booking insights across your events")).toBeVisible();
      });
    });
  }
});

test.describe("Locale-specific APIs must not 404", () => {
  for (const locale of ["en"]) {
    test(`/${locale}/api/logo shouldn't 404`, async ({ page }) => {
      const response = await page.goto(`/${locale}/api/logo`);
      expect(response?.status()).not.toBe(404);
      await expect(page.locator("svg")).toBeVisible();
    });
  }
});
