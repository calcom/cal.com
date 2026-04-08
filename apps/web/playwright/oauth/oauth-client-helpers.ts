import { randomBytes } from "node:crypto";
import path from "node:path";

import type { PrismaClient } from "@calcom/prisma";
import { expect, type Locator, type Page } from "@playwright/test";

export async function loginAsSeededAdmin(page: Page) {
  await page.goto("/auth/login");
  await page.getByTestId("login-form").locator("#email").fill("admin@example.com");
  await page.getByTestId("login-form").locator("#password").fill("ADMINadmin2022!");

  const responsePromise = page.waitForResponse(/\/api\/auth\/callback\/credentials/);
  await page.getByTestId("login-form").locator('[type="submit"]').click();
  await responsePromise;
}

export async function goToDeveloperOAuthSettings(page: Page): Promise<void> {
  if (page.url().includes("/settings/developer/oauth")) return;
  await page.goto("/settings/developer/oauth");
  await page.waitForLoadState();
}

export async function goToAdminOAuthSettings(page: Page): Promise<void> {
  if (page.url().includes("/settings/admin/oauth")) return;
  await page.goto("/settings/admin/oauth");
  await page.waitForLoadState();
}

type CreateOAuthClientInput = {
  name: string;
  purpose: string;
  redirectUri: string;
  websiteUrl: string;
  logoFileName: string;
  scopes?: string[];
};

type CreateOAuthClientResult = {
  clientId: string;
  clientSecret: string;
};

export async function createPendingOAuthClient(
  page: Page,
  input: CreateOAuthClientInput
): Promise<CreateOAuthClientResult> {
  await goToDeveloperOAuthSettings(page);

  await page.getByTestId("open-oauth-client-create-dialog").click();

  const form = page.getByTestId("oauth-client-create-form");
  await form.locator("#name").fill(input.name);
  await form.locator("#purpose").fill(input.purpose);
  await form.locator("#redirectUri-0").fill(input.redirectUri);
  await form.locator("#websiteUrl").fill(input.websiteUrl);

  await uploadOAuthClientLogo(page, input.logoFileName);

  if (input.scopes) {
    for (const scope of input.scopes) {
      await page.getByTestId(`oauth-scope-checkbox-${scope}`).click();
    }
  }

  const pkceToggle = page.getByTestId("oauth-client-pkce-toggle");
  await expect(pkceToggle).toHaveAttribute("data-unchecked", "");

  await page.getByTestId("oauth-client-create-submit").click();

  const submitted = page.getByTestId("oauth-client-submitted-modal");
  await expect(submitted).toBeVisible();

  const clientId = (await page.getByTestId("oauth-client-submitted-client-id").inputValue()).trim();
  expect(clientId.length).toBeGreaterThan(1);

  const clientSecret = (
    (await page.getByTestId("oauth-client-submitted-client-secret").inputValue()) ?? ""
  ).trim();
  expect(clientSecret.length).toBeGreaterThan(1);

  await page.getByTestId("oauth-client-submitted-done").click();

  return { clientId, clientSecret };
}

export async function openOAuthClientDetailsFromList(page: Page, clientId: string): Promise<Locator> {
  const details = page.getByTestId("oauth-client-details-form");
  await page.getByTestId(`oauth-client-list-item-${clientId}`).click();
  await expect(details).toBeVisible();
  await expect(details.getByTestId("oauth-client-details-client-id")).toHaveValue(clientId);
  return details;
}

export async function closeOAuthClientDetails(page: Page): Promise<void> {
  const details = page.getByTestId("oauth-client-details-form");
  if (!(await details.isVisible())) return;
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0, { timeout: 15_000 });
}

async function uploadOAuthClientLogo(page: Page, fileName: string): Promise<void> {
  await page.getByTestId("open-upload-oauth-client-logo-dialog").click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByTestId("open-upload-oauth-client-logo-filechooser").click(),
  ]);
  await fileChooser.setFiles(getFixturePath(fileName));
  await page.getByTestId("upload-oauth-client-logo").click();
}

function getFixturePath(fileName: string): string {
  return path.join(path.dirname(__filename), "..", "fixtures", fileName);
}

export async function createOAuthClientInDb({
  prisma,
  name,
  status = "APPROVED",
  userId,
}: {
  prisma: PrismaClient;
  name: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  userId?: number;
}) {
  const clientId = randomBytes(32).toString("hex");

  return prisma.oAuthClient.create({
    data: {
      clientId,
      name,
      redirectUris: ["https://example.com"],
      clientType: "CONFIDENTIAL",
      status,
      ...(userId && { user: { connect: { id: userId } } }),
    },
  });
}

export type MockAuthorization = {
  username: string;
  name: string;
  scopes: ("READ_BOOKING" | "READ_PROFILE")[];
  createdAt: Date;
  lastRefreshedAt: Date | null;
};

export async function createOAuthClientWithAuthorizations({
  prisma,
  name,
  ownerUserId,
  users,
  authorizations,
}: {
  prisma: PrismaClient;
  name: string;
  ownerUserId: number;
  users: {
    create: (opts: { username: string; name: string }) => Promise<{ id: number; email: string }>;
  };
  authorizations: MockAuthorization[];
}) {
  const client = await createOAuthClientInDb({ prisma, name, userId: ownerUserId });

  const createdUsers: { id: number; email: string }[] = [];
  for (const auth of authorizations) {
    const user = await users.create({
      username: auth.username,
      name: auth.name,
    });
    createdUsers.push(user);

    await prisma.oAuthAuthorization.create({
      data: {
        clientId: client.clientId,
        userId: user.id,
        scopes: auth.scopes,
        createdAt: auth.createdAt,
        lastRefreshedAt: auth.lastRefreshedAt,
      },
    });
  }

  return { client, createdUsers };
}

export async function cleanupOAuthTestData(prisma: PrismaClient, testPrefix: string) {
  await prisma.oAuthAuthorization.deleteMany({
    where: { client: { name: { startsWith: testPrefix } } },
  });
  await prisma.oAuthClient.deleteMany({
    where: { name: { startsWith: testPrefix } },
  });
}
