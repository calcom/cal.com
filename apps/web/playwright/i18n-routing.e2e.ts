import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Locale-specific pages must not 404", () => {
  for (const locale of ["en", "fr", "es"]) {
    test.describe(`/${locale}/* pages`, () => {
      test(`/${locale}/login shouldn't 404`, async ({ page }) => {
        const response = await page.goto(`/${locale}/login`);
        expect(response?.status()).not.toBe(404);
      });

      test(`/${locale}/auth/login shouldn't 404`, async ({ page }) => {
        const response = await page.goto(`/${locale}/auth/login`);
        expect(response?.status()).not.toBe(404);
      });

      test(`/${locale}/[user] page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        const response = await page.goto(`/${locale}/${user.username}`);
        expect(response?.status()).not.toBe(404);
      });

      test(`/${locale}/[user]/[type] page shouldn't 404`, async ({ page, users }) => {
        const user = await users.create();
        const response = await page.goto(`/${locale}/${user.username}/30-min`);
        expect(response?.status()).not.toBe(404);
      });
    });
  }
});
