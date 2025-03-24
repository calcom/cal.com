import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("/en/* pages must not 404", () => {
  test("/en/login shouldn't 404", async ({ page }) => {
    const response = await page.goto(`/en/login`);
    expect(response?.status()).not.toBe(404);
  });

  test("/en/auth/login shouldn't 404", async ({ page }) => {
    const response = await page.goto(`/en/auth/login`);
    expect(response?.status()).not.toBe(404);
  });

  test("/en/[user] page shouldn't 404", async ({ page, users }) => {
    const user = await users.create();
    const response = await page.goto(`/en/${user.username}`);
    expect(response?.status()).not.toBe(404);
  });

  test("/en/[user]/[type] page shouldn't 404", async ({ page, users }) => {
    const user = await users.create();
    const response = await page.goto(`/en/${user.username}/30-min`);
    expect(response?.status()).not.toBe(404);
  });
});
