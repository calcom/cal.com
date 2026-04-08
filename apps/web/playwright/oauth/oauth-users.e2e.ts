import { expect } from "@playwright/test";
import { test } from "../lib/fixtures";
import {
  cleanupOAuthTestData,
  createOAuthClientWithAuthorizations,
  goToDeveloperOAuthSettings,
  type MockAuthorization,
} from "./oauth-client-helpers";

function getMockAuthorizations(testId: string): MockAuthorization[] {
  return [
    {
      username: `oauth-alice-${testId}`,
      name: "Alice Example",
      scopes: ["READ_BOOKING", "READ_PROFILE"],
      createdAt: new Date("2026-01-15T10:00:00Z"),
      lastRefreshedAt: new Date("2026-02-20T14:30:00Z"),
    },
    {
      username: `oauth-bob-${testId}`,
      name: "Bob Example",
      scopes: ["READ_BOOKING"],
      createdAt: new Date("2026-02-01T08:00:00Z"),
      lastRefreshedAt: null,
    },
    {
      username: `oauth-carol-${testId}`,
      name: "Carol Example",
      scopes: ["READ_PROFILE"],
      createdAt: new Date("2026-03-01T12:00:00Z"),
      lastRefreshedAt: new Date("2026-03-05T09:00:00Z"),
    },
  ];
}

test.describe.configure({ mode: "parallel" });

test.describe("OAuth authorized users page", () => {
  test.afterEach(async ({ prisma, users }, testInfo) => {
    const testPrefix = `e2e-oauth-users-${testInfo.testId}-`;
    await cleanupOAuthTestData(prisma, testPrefix);
    await users.deleteAll();
  });

  test("Authorized users menu item is available from row actions and navigates to users page", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const owner = await users.create({ username: "oauth-users-owner" });
    const authorizations = getMockAuthorizations(testInfo.testId);

    const testPrefix = `e2e-oauth-users-${testInfo.testId}-`;
    const { client } = await createOAuthClientWithAuthorizations({
      prisma,
      name: `${testPrefix}client-${Date.now()}`,
      ownerUserId: owner.id,
      users,
      authorizations,
    });

    await owner.apiLogin();
    await goToDeveloperOAuthSettings(page);

    const listItem = page.getByTestId(`oauth-client-list-item-${client.clientId}`);
    await expect(listItem).toBeVisible();

    await page.getByTestId(`oauth-client-actions-${client.clientId}`).click();

    const usersItem = page.getByTestId(`oauth-client-users-${client.clientId}`);
    await expect(usersItem).toBeVisible();

    await usersItem.click();

    await expect(page).toHaveURL(new RegExp(`/settings/developer/oauth/${client.clientId}/users`));
  });

  test("users page shows correct count, user names, emails, and dates for 3 authorized users", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const owner = await users.create({ username: "oauth-users-owner-details" });
    const authorizations = getMockAuthorizations(testInfo.testId);

    const testPrefix = `e2e-oauth-users-${testInfo.testId}-`;
    const { client, createdUsers } = await createOAuthClientWithAuthorizations({
      prisma,
      name: `${testPrefix}details-${Date.now()}`,
      ownerUserId: owner.id,
      users,
      authorizations,
    });

    await owner.apiLogin();
    await page.goto(`/settings/developer/oauth/${client.clientId}/users`);

    const usersList = page.getByTestId("oauth-users-list");
    await expect(usersList).toBeVisible();

    const userRows = page.locator("[data-testid^='oauth-user-row-']");
    expect(await userRows.count()).toBe(3);

    const names = page.getByTestId("oauth-user-name");
    expect(await names.count()).toBe(3);
    for (const auth of authorizations) {
      await expect(names.filter({ hasText: auth.name })).toBeVisible();
    }

    const emails = page.getByTestId("oauth-user-email");
    expect(await emails.count()).toBe(3);
    for (const user of createdUsers) {
      await expect(emails.filter({ hasText: user.email })).toBeVisible();
    }

    const expectedDates = authorizations.map((auth) => ({
      authorizedAt: new Date(auth.createdAt).toLocaleDateString(),
      refreshedAt: auth.lastRefreshedAt ? new Date(auth.lastRefreshedAt).toLocaleDateString() : "-",
    }));

    for (let i = 0; i < createdUsers.length; i++) {
      const row = page.getByTestId(`oauth-user-row-${createdUsers[i].id}`);
      await expect(row.getByTestId("oauth-user-authorized-date")).toHaveText(expectedDates[i].authorizedAt);
      await expect(row.getByTestId("oauth-user-refreshed-date")).toHaveText(expectedDates[i].refreshedAt);
    }
  });

  test("users page shows empty state when no authorizations exist", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const owner = await users.create({ username: "oauth-users-owner-empty" });

    const testPrefix = `e2e-oauth-users-${testInfo.testId}-`;
    const { client } = await createOAuthClientWithAuthorizations({
      prisma,
      name: `${testPrefix}empty-${Date.now()}`,
      ownerUserId: owner.id,
      users,
      authorizations: [],
    });

    await owner.apiLogin();
    await page.goto(`/settings/developer/oauth/${client.clientId}/users`);

    await expect(page.getByTestId("empty-screen")).toBeVisible();
  });

  test("back button navigates back from users page", async ({ page, users, prisma }, testInfo) => {
    const owner = await users.create({ username: "oauth-users-owner-back" });
    const authorizations = getMockAuthorizations(testInfo.testId);

    const testPrefix = `e2e-oauth-users-${testInfo.testId}-`;
    const { client } = await createOAuthClientWithAuthorizations({
      prisma,
      name: `${testPrefix}back-${Date.now()}`,
      ownerUserId: owner.id,
      users,
      authorizations,
    });

    await owner.apiLogin();
    await goToDeveloperOAuthSettings(page);

    await page.getByTestId(`oauth-client-actions-${client.clientId}`).click();
    await page.getByTestId(`oauth-client-users-${client.clientId}`).click();
    await expect(page).toHaveURL(new RegExp(`/settings/developer/oauth/${client.clientId}/users`));

    await page.getByTestId("oauth-users-back").click();

    await expect(page).toHaveURL(/\/settings\/developer\/oauth$/);
  });
});
