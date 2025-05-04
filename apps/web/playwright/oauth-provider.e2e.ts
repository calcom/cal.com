import { expect } from "@playwright/test";
import { randomBytes } from "crypto";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";

import { test } from "./lib/fixtures";

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

let client: {
  clientId: string;
  redirectUri: string;
  orginalSecret: string;
  name: string;
  clientSecret: string;
  logo: string | null;
};

test.describe("OAuth Provider", () => {
  test.beforeAll(async () => {
    client = await createTestCLient();
  });
  test("should create valid access token & refresh token for user", async ({ page, users }) => {
    const user = await users.create({ username: "test user", name: "test user" });
    await user.apiLogin();

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&response_type=code&scope=READ_PROFILE&state=1234`
    );
    await page.getByTestId("allow-button").click();

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    const url = new URL(page.url());

    // authorization code that is returned to client with redirect uri
    const code = url.searchParams.get("code");

    // request token with authorization code
    const tokenForm = new URLSearchParams();
    tokenForm.append("code", code ?? "");
    tokenForm.append("client_id", client.clientId);
    tokenForm.append("client_secret", client.orginalSecret);
    tokenForm.append("grant_type", "authorization_code");
    tokenForm.append("redirect_uri", client.redirectUri);
    const tokenResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/token`, {
      body: tokenForm.toString(),
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokenData = await tokenResponse.json();

    // test if token is valid
    const meResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const meData = await meResponse.json();

    // check if user access token is valid
    expect(meData.username.startsWith("test user")).toBe(true);

    // request new token with refresh token
    const refreshTokenForm = new URLSearchParams();
    refreshTokenForm.append("refresh_token", tokenData.refresh_token);
    refreshTokenForm.append("client_id", client.clientId);
    refreshTokenForm.append("client_secret", client.orginalSecret);
    refreshTokenForm.append("grant_type", "refresh_token");
    const refreshTokenResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/refreshToken`, {
      body: refreshTokenForm.toString(),
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const refreshTokenData = await refreshTokenResponse.json();

    expect(refreshTokenData.access_token).not.toBe(tokenData.access_token);

    const validTokenResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    expect(meData.username.startsWith("test user")).toBe(true);
  });

  test("should create valid access token & refresh token for team", async ({ page, users }) => {
    const user = await users.create({ username: "test user", name: "test user" }, { hasTeam: true });
    await user.apiLogin();

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&response_type=code&scope=READ_PROFILE&state=1234`
    );

    await page.locator("#account-select").click();

    await page.locator("#react-select-2-option-1").click();

    await page.getByTestId("allow-button").click();

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    const url = new URL(page.url());

    // authorization code that is returned to client with redirect uri
    const code = url.searchParams.get("code");

    // request token with authorization code
    const tokenForm = new URLSearchParams();
    tokenForm.append("code", code ?? "");
    tokenForm.append("client_id", client.clientId);
    tokenForm.append("client_secret", client.orginalSecret);
    tokenForm.append("grant_type", "authorization_code");
    tokenForm.append("redirect_uri", client.redirectUri);
    const tokenResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/token`, {
      body: tokenForm.toString(),
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokenData = await tokenResponse.json();

    // test if token is valid
    const meResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const meData = await meResponse.json();

    // Check if team access token is valid
    expect(meData.username).toEqual(`user-id-${user.id}'s Team`);

    // request new token with refresh token
    const refreshTokenForm = new URLSearchParams();
    refreshTokenForm.append("refresh_token", tokenData.refresh_token);
    refreshTokenForm.append("client_id", client.clientId);
    refreshTokenForm.append("client_secret", client.orginalSecret);
    refreshTokenForm.append("grant_type", "refresh_token");
    const refreshTokenResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/refreshToken`, {
      body: refreshTokenForm.toString(),
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const refreshTokenData = await refreshTokenResponse.json();

    expect(refreshTokenData.access_token).not.toBe(tokenData.access_token);

    const validTokenResponse = await fetch(`${WEBAPP_URL}/api/auth/oauth/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    expect(meData.username).toEqual(`user-id-${user.id}'s Team`);
  });

  test("redirect not logged-in users to login page and after forward to authorization page", async ({
    page,
    users,
  }) => {
    const user = await users.create({ username: "test-user", name: "test user" });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&response_type=code&scope=READ_PROFILE&state=1234`
    );

    // check if user is redirected to login page
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.username || "");
    await page.locator('[type="submit"]').click();

    await page.waitForSelector("#account-select");

    await expect(page.getByText("test user")).toBeVisible();
  });
});

const createTestCLient = async () => {
  const [hashedSecret, secret] = generateSecret();
  const clientId = randomBytes(32).toString("hex");

  const client = await prisma.oAuthClient.create({
    data: {
      name: "Test Client",
      clientId,
      clientSecret: hashedSecret,
      redirectUri: "https://example.com",
    },
  });

  return { ...client, orginalSecret: secret };
};
