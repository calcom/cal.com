import { expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

import { test } from "../lib/fixtures";
import type { PrismaClient } from "@calcom/prisma";

test.describe("OAuth - refresh tokens", () => {
  test.afterEach(async ({ prisma, users }, testInfo) => {
    const testPrefix = `e2e-oauth-refresh-status-${testInfo.testId}-`;

    await prisma.oAuthClient.deleteMany({
      where: {
        name: {
          startsWith: testPrefix,
        },
      },
    });

    await users.deleteAll();
  });

  async function createOAuthClient({
    prisma,
    name,
    status,
    clientType,
  }: {
    prisma: PrismaClient;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    clientType: "PUBLIC" | "CONFIDENTIAL";
  }) {
    const clientId = randomBytes(32).toString("hex");

    const client = await prisma.oAuthClient.create({
      data: {
        clientId,
        name,
        redirectUri: "https://example.com",
        clientSecret: null,
        clientType,
        status,
      },
    });

    return client;
  }

  function signRefreshToken(clientId: string, userId: number): string {
    const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new Error("CALENDSO_ENCRYPTION_KEY is not set");
    }

    return jwt.sign(
      {
        userId,
        teamId: null,
        scope: [],
        token_type: "Refresh Token",
        clientId,
      },
      secretKey,
      { expiresIn: 30 * 24 * 60 * 60 }
    );
  }

  test("token refresh fails if client is not approved", async ({ page, users, prisma }, testInfo) => {
    const user = await users.create({ username: "oauth-refresh-status-check" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-refresh-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}pending-${Date.now()}`,
      status: "PENDING",
      clientType: "PUBLIC",
    });

    const refreshToken = signRefreshToken(client.clientId, user.id);

    const refreshResponse = await page.request.post("/api/auth/oauth/refreshToken", {
      form: {
        grant_type: "refresh_token",
        client_id: client.clientId,
        refresh_token: refreshToken,
      },
    });

    expect(refreshResponse.status()).toBe(401);

    const refreshJson = await refreshResponse.json();
    expect(refreshJson.error).toBe("unauthorized_client");
  });
});
