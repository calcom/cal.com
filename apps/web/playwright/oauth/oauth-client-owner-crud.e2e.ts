import path from "node:path";
import type { PrismaClient } from "@calcom/prisma";
import type { OAuthClientType } from "@calcom/prisma/enums";
import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "../lib/fixtures";

async function loginAsSeededAdminAndGoToOAuthSettings(page: Page) {
  await page.goto("/auth/login");

  // Seeded admin user from scripts/seed.ts
  await page.getByTestId("login-form").locator("#email").fill("admin@example.com");
  await page.getByTestId("login-form").locator("#password").fill("ADMINadmin2022!");

  const responsePromise = page.waitForResponse(/\/api\/auth\/callback\/credentials/);
  await page.getByTestId("login-form").locator('[type="submit"]').click();
  await responsePromise;

  await page.goto("/settings/developer/oauth");
}

type CreateOAuthClientInput = {
  name: string;
  purpose: string;
  redirectUri: string;
  websiteUrl?: string;
  enablePkce: boolean;
  logoFileName?: string;
};

type CreateOAuthClientResult = {
  clientId: string;
  clientSecret: string | null;
};

type UpdateOAuthClientInput = {
  clientId: string;
  name: string;
  purpose: string;
  redirectUri: string;
  websiteUrl: string;
  logoFileName?: string;
};

type ExpectedOAuthClientDetails = {
  clientId: string;
  name: string;
  purpose: string;
  redirectUri: string;
  websiteUrl: string;
  statusLabel: "Approved" | "Rejected" | "Pending";
  pkceEnabled: boolean;
  hasLogo: boolean;
};

type TruthyExpectation = { kind: "truthy" };
const TRUTHY: TruthyExpectation = { kind: "truthy" };

type OAuthClientDbExpectations = {
  name?: string;
  purpose?: string;
  redirectUri?: string;
  websiteUrl?: string | null;
  status?: string;
  clientType?: OAuthClientType;
  clientSecret?: string | null | TruthyExpectation;
  logo?: string | null | TruthyExpectation;
};

const oAuthClientSelect = {
  clientId: true,
  name: true,
  purpose: true,
  redirectUri: true,
  websiteUrl: true,
  status: true,
  clientType: true,
  clientSecret: true,
  logo: true,
} as const;

async function createOAuthClient(
  page: Page,
  input: CreateOAuthClientInput
): Promise<CreateOAuthClientResult> {
  await goToOAuthSettings(page);

  await page.locator("header").getByTestId("open-oauth-client-create-dialog").click();

  const form = getOAuthClientCreateForm(page);
  await getOAuthClientCreateNameInput(form).fill(input.name);
  await getOAuthClientCreatePurposeInput(form).fill(input.purpose);
  await getOAuthClientCreateRedirectUriInput(form).fill(input.redirectUri);
  if (input.websiteUrl) {
    await getOAuthClientCreateWebsiteUrlInput(form).fill(input.websiteUrl);
  }

  if (input.logoFileName) {
    await uploadOAuthClientLogo(page, input.logoFileName);
  }

  const pkceToggle = getOAuthClientPkceToggle(page);
  if (input.enablePkce) {
    await pkceToggle.click();
    await expect(pkceToggle).toHaveAttribute("data-state", "checked");
  } else {
    await expect(pkceToggle).toHaveAttribute("data-state", "unchecked");
  }

  await page.getByTestId("oauth-client-create-submit").click();

  const submitted = getOAuthClientSubmittedModal(page);
  await expect(submitted).toBeVisible();
  await expect(page.getByTestId("dialog-title")).toHaveText("OAuth Client Submitted");
  await expect(submitted.getByText(input.name)).toBeVisible();

  const clientId = ((await page.getByTestId("oauth-client-submitted-client-id").textContent()) ?? "").trim();
  expect(clientId.length).toBeGreaterThan(1);

  const secretLocator = page.getByTestId("oauth-client-submitted-client-secret");
  const clientSecret = input.enablePkce ? null : ((await secretLocator.textContent()) ?? "").trim();

  if (input.enablePkce) {
    await expect(secretLocator).toHaveCount(0);
  } else {
    expect(clientSecret?.length).toBeGreaterThan(1);
  }

  await page.getByTestId("oauth-client-submitted-done").click();

  await expectOAuthClientInList(page, { clientId, name: input.name });

  return { clientId, clientSecret };
}

async function updateOAuthClient(page: Page, input: UpdateOAuthClientInput): Promise<void> {
  await goToOAuthSettings(page);

  const details = await openOAuthClientDetails(page, input.clientId);
  await getOAuthClientDetailsNameInput(details).fill(input.name);
  await getOAuthClientDetailsPurposeInput(details).fill(input.purpose);
  await getOAuthClientDetailsRedirectUriInput(details).fill(input.redirectUri);
  await getOAuthClientDetailsWebsiteUrlInput(details).fill(input.websiteUrl);

  if (input.logoFileName) {
    await uploadOAuthClientLogo(page, input.logoFileName);
  }

  const updateResponsePromise = page.waitForResponse((res) =>
    res.url().includes("/api/trpc/oAuth/updateClient")
  );
  await page.getByTestId("oauth-client-details-save").click();
  const updateResponse = await updateResponsePromise;
  expect(updateResponse.ok()).toBe(true);

  await closeOAuthClientDetails(page);

  await expectOAuthClientInList(page, { clientId: input.clientId, name: input.name });
}

async function deleteOAuthClient(
  page: Page,
  clientId: string,
  expectedNameToDisappear: string
): Promise<void> {
  await goToOAuthSettings(page);

  await openOAuthClientDetails(page, clientId);
  await page.getByTestId("oauth-client-details-delete-trigger").click();
  await expect(page.getByTestId("oauth-client-details-delete-confirm")).toBeVisible();

  const deleteResponsePromise = page.waitForResponse((res) =>
    res.url().includes("/api/trpc/oAuth/deleteClient")
  );
  await page.getByTestId("oauth-client-details-delete-confirm").click();
  const deleteResponse = await deleteResponsePromise;
  expect(deleteResponse.ok()).toBe(true);

  await expect(getOAuthClientDetailsForm(page)).toHaveCount(0);
  await expect(getOAuthClientList(page).getByText(expectedNameToDisappear)).toHaveCount(0);
  await expect(getOAuthClientListItem(page, clientId)).toHaveCount(0);
}

async function closeOAuthClientDetails(page: Page): Promise<void> {
  const details = getOAuthClientDetailsForm(page);
  if (!(await details.isVisible())) return;
  await page.getByTestId("oauth-client-details-close").click();
  await expect(details).toHaveCount(0);
}

async function openOAuthClientDetails(page: Page, clientId: string): Promise<Locator> {
  const details = getOAuthClientDetailsForm(page);
  if (await details.isVisible()) {
    const visibleClientId = (
      (await details.getByTestId("oauth-client-details-client-id").textContent()) ?? ""
    ).trim();
    if (visibleClientId === clientId) return details;

    await closeOAuthClientDetails(page);
  }

  await getOAuthClientListItem(page, clientId).click();
  await expect(details).toBeVisible();
  await expect(details.getByTestId("oauth-client-details-client-id")).toHaveText(clientId);
  return details;
}

async function expectOAuthClientDeletedInDb(prisma: PrismaClient, clientId: string): Promise<void> {
  const dbClientAfterDelete = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: { clientId: true },
  });
  expect(dbClientAfterDelete).toBeNull();
}

async function expectOAuthClientInDb(
  prisma: PrismaClient,
  clientId: string,
  expected: OAuthClientDbExpectations
): Promise<void> {
  const dbClient = await prisma.oAuthClient.findUniqueOrThrow({
    where: { clientId },
    select: oAuthClientSelect,
  });

  if (expected.name !== undefined) expect(dbClient.name).toBe(expected.name);
  if (expected.purpose !== undefined) expect(dbClient.purpose).toBe(expected.purpose);
  if (expected.redirectUri !== undefined) expect(dbClient.redirectUri).toBe(expected.redirectUri);
  if (expected.websiteUrl !== undefined) expect(dbClient.websiteUrl).toBe(expected.websiteUrl);
  if (expected.status !== undefined) expect(dbClient.status).toBe(expected.status);
  if (expected.clientType !== undefined)
    expect(dbClient.clientType as OAuthClientType).toBe(expected.clientType);

  if (expected.clientSecret !== undefined) {
    if (typeof expected.clientSecret === "object" && expected.clientSecret?.kind === "truthy") {
      expect(dbClient.clientSecret).toBeTruthy();
    } else {
      expect(dbClient.clientSecret).toBe(expected.clientSecret);
    }
  }

  if (expected.logo !== undefined) {
    if (typeof expected.logo === "object" && expected.logo?.kind === "truthy") {
      expect(dbClient.logo).toBeTruthy();
    } else {
      expect(dbClient.logo).toBe(expected.logo);
    }
  }
}

async function expectOAuthClientDetails(
  details: Locator,
  expected: ExpectedOAuthClientDetails
): Promise<void> {
  await expect(details.getByTestId("oauth-client-details-status-badge")).toHaveText(expected.statusLabel);
  await expect(details.getByTestId("oauth-client-details-client-id")).toHaveText(expected.clientId);
  await expect(getOAuthClientDetailsNameInput(details)).toHaveValue(expected.name);
  await expect(getOAuthClientDetailsPurposeInput(details)).toHaveValue(expected.purpose);
  await expect(getOAuthClientDetailsRedirectUriInput(details)).toHaveValue(expected.redirectUri);
  await expect(getOAuthClientDetailsWebsiteUrlInput(details)).toHaveValue(expected.websiteUrl);

  const pkceToggle = details.page().getByTestId("oauth-client-pkce-toggle");
  await expect(pkceToggle).toHaveAttribute("data-state", expected.pkceEnabled ? "checked" : "unchecked");

  await expect(details.locator('img[alt="Logo"][src]')).toHaveCount(expected.hasLogo ? 1 : 0);
}

async function expectOAuthClientInList(page: Page, input: { clientId: string; name: string }): Promise<void> {
  const row = getOAuthClientListItem(page, input.clientId);
  await expect(row).toBeVisible();
  await expect(row.getByText(input.name)).toBeVisible();
}

async function goToOAuthSettings(page: Page): Promise<void> {
  if (page.url().includes("/settings/developer/oauth")) return;
  await page.goto("/settings/developer/oauth");
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

test.describe.configure({ mode: "parallel" });

test.describe("OAuth client creation", () => {
  test.afterEach(async ({ users, prisma }, testInfo) => {
    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;

    // Clean up any clients created by the e2e tests (by naming convention)
    await prisma.oAuthClient.deleteMany({
      where: {
        name: {
          startsWith: testPrefix,
        },
      },
    });

    await users.deleteAll();
  });

  test("cannot be created without required fields (name, purpose, redirect uri)", async ({ page }) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    await page.locator("header").getByTestId("open-oauth-client-create-dialog").click();

    const form = page.getByTestId("oauth-client-create-form");
    await expect(form).toBeVisible();

    // Submit immediately - should trigger native browser required field validation
    await page.getByTestId("oauth-client-create-submit").click();

    // Playwright can assert native validation message via validationMessage.
    // This matches Chrome's default: "Please fill out this field."
    const nameInput = form.locator("#name");
    const purposeInput = form.locator("#purpose");
    const redirectUriInput = form.locator("#redirectUri");

    await expect(nameInput).toHaveJSProperty("validationMessage", "Please fill out this field.");

    // Fill name, submit -> purpose should be flagged
    await nameInput.fill("Test OAuth Client");
    await page.getByTestId("oauth-client-create-submit").click();
    await expect(purposeInput).toHaveJSProperty("validationMessage", "Please fill out this field.");

    // Fill purpose, submit -> redirect URI should be flagged
    await purposeInput.fill("Test purpose");
    await page.getByTestId("oauth-client-create-submit").click();
    await expect(redirectUriInput).toHaveJSProperty("validationMessage", "Please fill out this field.");
  });

  test("creates a private (confidential) OAuth client with minimal fields; submitted modal shows id+secret; list/details/DB reflect values", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;
    const clientName = `${testPrefix}private-minimal-${Date.now()}`;
    const purpose = "Used for E2E testing (minimal)";
    const redirectUri = "https://example.com/callback";

    // Ensure PKCE is off (private/confidential)
    const { clientId, clientSecret } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUri,
      enablePkce: false,
    });
    expect(clientSecret?.length).toBeGreaterThan(1);

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: false,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl: null,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecret: TRUTHY,
      logo: null,
    });

    const editedName = `${testPrefix}private-minimal-edited-${Date.now()}`;
    const editedPurpose = "Updated purpose (minimal)";
    const editedRedirectUri = "https://example.com/updated-callback";
    const editedWebsiteUrl = "https://updated.example.com";

    await updateOAuthClient(page, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      logoFileName: "cal2.png",
    });

    const editedDetails = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetails, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await page.reload();
    const editedDetailsAfterReload = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetailsAfterReload, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecret: TRUTHY,
      logo: TRUTHY,
    });

    await deleteOAuthClient(page, clientId, editedName);

    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("editing redirect uri of an approved client triggers reapproval (status becomes PENDING)", async ({
    page,
    prisma,
    users,
  }, testInfo) => {
    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;

    const user = await users.create();
    await user.apiLogin("/settings/developer/oauth");

    const clientName = `${testPrefix}approved-client-${Date.now()}`;
    const clientId = `${testPrefix.replaceAll("-", "")}approved${Date.now()}`;

    const initialRedirectUri = "https://example.com/approved-callback";

    await prisma.oAuthClient.create({
      data: {
        clientId,
        name: clientName,
        purpose: "Approved client for redirectUri reapproval test",
        redirectUri: initialRedirectUri,
        websiteUrl: null,
        logo: null,
        clientType: "PUBLIC",
        clientSecret: null,
        status: "APPROVED",
        userId: user.id,
      },
    });

    await page.reload();

    const detailsBeforeUpdate = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(detailsBeforeUpdate, {
      clientId,
      name: clientName,
      purpose: "Approved client for redirectUri reapproval test",
      redirectUri: initialRedirectUri,
      websiteUrl: "",
      statusLabel: "Approved",
      pkceEnabled: true,
      hasLogo: false,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      status: "APPROVED",
      redirectUri: initialRedirectUri,
      clientType: "PUBLIC",
      clientSecret: null,
    });

    const updatedRedirectUri = `https://example.com/approved-updated-${Date.now()}`;

    await getOAuthClientDetailsRedirectUriInput(detailsBeforeUpdate).fill(updatedRedirectUri);

    const updateResponsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/trpc/oAuth/updateClient")
    );
    await page.getByTestId("oauth-client-details-save").click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBe(true);

    await closeOAuthClientDetails(page);

    await page.reload();

    const detailsAfterUpdate = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(detailsAfterUpdate, {
      clientId,
      name: clientName,
      purpose: "Approved client for redirectUri reapproval test",
      redirectUri: updatedRedirectUri,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      status: "PENDING",
      redirectUri: updatedRedirectUri,
      clientType: "PUBLIC",
      clientSecret: null,
    });
  });

  test("creates a private (confidential) OAuth client; submitted modal shows id+secret; list/details/DB reflect values", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;
    const clientName = `${testPrefix}private-${Date.now()}`;
    const purpose = "Used for E2E testing";
    const redirectUri = "https://example.com/callback";
    const websiteUrl = "https://example.com";

    // Upload logo using ImageUploader testIds
    // Ensure PKCE is off (private/confidential)
    const { clientId, clientSecret } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl,
      enablePkce: false,
      logoFileName: "cal.png",
    });
    expect(clientSecret?.length).toBeGreaterThan(1);

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecret: TRUTHY,
      logo: TRUTHY,
    });

    const editedName = `${testPrefix}private-edited-${Date.now()}`;
    const editedPurpose = "Updated purpose (full private)";
    const editedRedirectUri = "https://example.com/full-private-updated";
    const editedWebsiteUrl = "https://full-private.example.com";

    await updateOAuthClient(page, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      logoFileName: "cal2.png",
    });

    const editedDetails = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetails, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await page.reload();
    const editedDetailsAfterReload = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetailsAfterReload, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecret: TRUTHY,
      logo: TRUTHY,
    });

    await deleteOAuthClient(page, clientId, editedName);

    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("creates a public (PKCE) OAuth client; submitted modal shows id but no secret; list/details/DB reflect values", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;
    const clientName = `${testPrefix}public-${Date.now()}`;
    const purpose = "Used for E2E testing (public)";
    const redirectUri = "https://example.com/callback";
    const websiteUrl = "https://example.com";

    // Enable PKCE
    // For public (PKCE) clients we should not show a client secret
    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl,
      enablePkce: true,
    });

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl,
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUri,
      websiteUrl,
      status: "PENDING",
      clientType: "PUBLIC",
      clientSecret: null,
      logo: null,
    });

    const editedName = `${testPrefix}public-edited-${Date.now()}`;
    const editedPurpose = "Updated purpose (public)";
    const editedRedirectUri = "https://example.com/public-updated";
    const editedWebsiteUrl = "https://public-updated.example.com";

    await updateOAuthClient(page, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      logoFileName: "cal2.png",
    });

    const editedDetails = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetails, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await page.reload();
    const editedDetailsAfterReload = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetailsAfterReload, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      name: editedName,
      purpose: editedPurpose,
      redirectUri: editedRedirectUri,
      websiteUrl: editedWebsiteUrl,
      status: "PENDING",
      clientType: "PUBLIC",
      clientSecret: null,
      logo: TRUTHY,
    });

    await deleteOAuthClient(page, clientId, editedName);

    await expectOAuthClientDeletedInDb(prisma, clientId);
  });
});

function getFixturePath(fileName: string): string {
  return path.join(path.dirname(__filename), "..", "fixtures", fileName);
}

function getOAuthClientCreateForm(page: Page): Locator {
  return page.getByTestId("oauth-client-create-form");
}

function getOAuthClientSubmittedModal(page: Page): Locator {
  return page.getByTestId("oauth-client-submitted-modal");
}

function getOAuthClientList(page: Page): Locator {
  return page.getByTestId("oauth-clients-list");
}

function getOAuthClientListItem(page: Page, clientId: string): Locator {
  return page.getByTestId(`oauth-client-list-item-${clientId}`);
}

function getOAuthClientDetailsForm(page: Page): Locator {
  return page.getByTestId("oauth-client-details-form");
}

function getOAuthClientPkceToggle(page: Page): Locator {
  return page.getByTestId("oauth-client-pkce-toggle");
}

function getOAuthClientCreateNameInput(form: Locator): Locator {
  return form.locator("#name");
}

function getOAuthClientCreatePurposeInput(form: Locator): Locator {
  return form.locator("#purpose");
}

function getOAuthClientCreateRedirectUriInput(form: Locator): Locator {
  return form.locator("#redirectUri");
}

function getOAuthClientCreateWebsiteUrlInput(form: Locator): Locator {
  return form.locator("#websiteUrl");
}

function getOAuthClientDetailsNameInput(details: Locator): Locator {
  return details.locator("#name");
}

function getOAuthClientDetailsPurposeInput(details: Locator): Locator {
  return details.locator("#purpose");
}

function getOAuthClientDetailsRedirectUriInput(details: Locator): Locator {
  return details.locator("#redirectUri");
}

function getOAuthClientDetailsWebsiteUrlInput(details: Locator): Locator {
  return details.locator("#websiteUrl");
}
