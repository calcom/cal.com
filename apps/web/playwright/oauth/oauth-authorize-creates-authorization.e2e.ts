import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";

import { cleanupOAuthTestData, createOAuthClientInDb } from "./oauth-client-helpers";

test.describe("OAuth authorize - creates OAuthAuthorization record", () => {
  test.afterEach(async ({ prisma, users }, testInfo) => {
    const testPrefix = `e2e-oauth-auth-record-${testInfo.testId}-`;
    await cleanupOAuthTestData(prisma, testPrefix);
    await users.deleteAll();
  });

  test("authorizing an APPROVED client creates an OAuthAuthorization record", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-auth-record" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-auth-record-${testInfo.testId}-`;
    const client = await createOAuthClientInDb({
      prisma,
      name: `${testPrefix}approved-${Date.now()}`,
    });

    const authorizationBefore = await prisma.oAuthAuthorization.findUnique({
      where: { userId_clientId: { userId: user.id, clientId: client.clientId } },
    });
    expect(authorizationBefore).toBeNull();

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUris[0]}&state=1234`
    );

    await page.waitForSelector('[data-testid="allow-button"]');
    await page.getByTestId("allow-button").click();

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    const authorizationAfter = await prisma.oAuthAuthorization.findUnique({
      where: { userId_clientId: { userId: user.id, clientId: client.clientId } },
      select: {
        userId: true,
        clientId: true,
        scopes: true,
        createdAt: true,
        lastRefreshedAt: true,
      },
    });

    expect(authorizationAfter).not.toBeNull();
    expect(authorizationAfter!.userId).toBe(user.id);
    expect(authorizationAfter!.clientId).toBe(client.clientId);
    expect(authorizationAfter!.createdAt).toBeInstanceOf(Date);
    expect(authorizationAfter!.lastRefreshedAt).toBeNull();
  });

  test("re-authorizing updates scopes instead of creating duplicate", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-auth-record-reauth" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-auth-record-${testInfo.testId}-`;
    const client = await createOAuthClientInDb({
      prisma,
      name: `${testPrefix}reauth-${Date.now()}`,
    });

    // First authorization
    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUris[0]}&state=1234`
    );
    await page.waitForSelector('[data-testid="allow-button"]');
    await page.getByTestId("allow-button").click();
    await page.waitForFunction(() => window.location.href.startsWith("https://example.com"));

    // Second authorization
    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUris[0]}&state=5678`
    );
    await page.waitForSelector('[data-testid="allow-button"]');
    await page.getByTestId("allow-button").click();
    await page.waitForFunction(() => window.location.href.startsWith("https://example.com"));

    // Should still be exactly one record (upsert behavior)
    const authorizations = await prisma.oAuthAuthorization.findMany({
      where: { userId: user.id, clientId: client.clientId },
    });

    expect(authorizations).toHaveLength(1);
  });
});
