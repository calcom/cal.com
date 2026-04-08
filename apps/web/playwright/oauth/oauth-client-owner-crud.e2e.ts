import path from "node:path";
import { OAUTH_SCOPE_CATEGORIES, OAUTH_SCOPES } from "@calcom/features/oauth/constants";
import { MAX_REDIRECT_URIS } from "@calcom/features/oauth/utils/validateRedirectUris";
import type { PrismaClient } from "@calcom/prisma";
import type { AccessScope, OAuthClientType } from "@calcom/prisma/enums";
import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "../lib/fixtures";

async function loginAsSeededAdminAndGoToOAuthSettings(page: Page) {
  await page.goto("/auth/login");

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
  redirectUris: string[];
  websiteUrl?: string;
  enablePkce: boolean;
  logoFileName?: string;
  scopes?: AccessScope[];
};

type CreateOAuthClientResult = {
  clientId: string;
  clientSecret: string | null;
};

type UpdateOAuthClientInput = {
  clientId: string;
  name: string;
  purpose: string;
  redirectUris: string[];
  websiteUrl: string;
  logoFileName?: string;
  scopes?: AccessScope[];
};

type ExpectedOAuthClientDetails = {
  clientId: string;
  name: string;
  purpose: string;
  redirectUris: string[];
  websiteUrl: string;
  statusLabel: "Approved" | "Rejected" | "Pending";
  pkceEnabled: boolean;
  hasLogo: boolean;
  scopes?: AccessScope[];
};

type TruthyExpectation = { kind: "truthy" };
const TRUTHY: TruthyExpectation = { kind: "truthy" };

type OAuthClientDbExpectations = {
  name?: string;
  purpose?: string;
  redirectUris?: string[];
  websiteUrl?: string | null;
  status?: string;
  clientType?: OAuthClientType;
  clientSecretsCount?: number;
  logo?: string | null | TruthyExpectation;
  scopes?: AccessScope[];
};

const oAuthClientSelect = {
  clientId: true,
  name: true,
  purpose: true,
  redirectUris: true,
  websiteUrl: true,
  status: true,
  clientType: true,
  logo: true,
  _count: { select: { clientSecrets: true } },
  scopes: true,
} as const;

async function expandAllScopeCategories(page: Page) {
  for (const category of OAUTH_SCOPE_CATEGORIES) {
    const categoryButton = page.getByTestId(`oauth-scope-category-${category.labelKey}`);
    const isExpanded = await categoryButton.evaluate((el) => el.hasAttribute("data-panel-open"));
    if (!isExpanded) {
      await categoryButton.click();
    }
  }
}

function getRedirectUriInputs(container: Locator): Locator {
  return container.locator('[id^="redirectUri-"]');
}

function getRedirectUriInput(container: Locator, index: number): Locator {
  return container.locator(`#redirectUri-${index}`);
}

function getAddRedirectUriButton(container: Locator): Locator {
  return container.locator('button:has-text("Add redirect URI"), button:has-text("Maximum")');
}

function getRedirectUriTrashButton(container: Locator, index: number): Locator {
  return container.getByTestId(`remove-redirect-uri-${index}`);
}

async function removeExtraRedirectUriInputs(container: Locator, targetCount: number): Promise<void> {
  const currentCount = await getRedirectUriInputs(container).count();
  for (let i = currentCount - 1; i >= 1 && i >= targetCount; i--) {
    const trashButton = getRedirectUriTrashButton(container, i);
    if (await trashButton.isVisible()) {
      await trashButton.click();
    }
  }
}

async function clickAddRedirectUri(container: Locator): Promise<void> {
  await getAddRedirectUriButton(container).first().click();
}

async function addRedirectUriInputs(container: Locator, targetCount: number): Promise<void> {
  const currentCount = await getRedirectUriInputs(container).count();
  for (let i = currentCount; i < targetCount; i++) {
    await clickAddRedirectUri(container);
  }
}

async function fillRedirectUris(container: Locator, uris: string[]): Promise<void> {
  await removeExtraRedirectUriInputs(container, uris.length);
  await addRedirectUriInputs(container, uris.length);

  for (let i = 0; i < uris.length; i++) {
    const input = getRedirectUriInput(container, i);
    await input.clear();
    await input.fill(uris[i]);
  }
}

async function createOAuthClient(
  page: Page,
  input: CreateOAuthClientInput
): Promise<CreateOAuthClientResult> {
  await goToOAuthSettings(page);

  await page.getByTestId("open-oauth-client-create-dialog").click();

  const form = getOAuthClientCreateForm(page);
  await getOAuthClientCreateNameInput(form).fill(input.name);
  await getOAuthClientCreatePurposeInput(form).fill(input.purpose);

  await fillRedirectUris(form, input.redirectUris);

  if (input.websiteUrl) {
    await getOAuthClientCreateWebsiteUrlInput(form).fill(input.websiteUrl);
  }

  if (input.logoFileName) {
    await uploadOAuthClientLogo(page, input.logoFileName);
  }

  const pkceToggle = getOAuthClientPkceToggle(page);
  if (input.enablePkce) {
    await pkceToggle.click();
    await expect(pkceToggle).toHaveAttribute("data-checked", "");
  } else {
    await expect(pkceToggle).toHaveAttribute("data-unchecked", "");
  }

  if (input.scopes) {
    await expandAllScopeCategories(page);
    for (const scope of OAUTH_SCOPES) {
      const scopeCheckbox = page.getByTestId(`oauth-scope-checkbox-${scope}`);
      const isChecked = await scopeCheckbox.evaluate((el) => el.hasAttribute("data-checked"));
      const shouldBeChecked = input.scopes.includes(scope);
      if (isChecked !== shouldBeChecked) {
        await scopeCheckbox.click();
      }
    }
  }

  await page.getByTestId("oauth-client-create-submit").click();

  const submitted = getOAuthClientSubmittedModal(page);
  await expect(submitted).toBeVisible();
  await expect(page.getByRole("heading", { name: "OAuth Client Submitted" }).first()).toBeVisible();
  await expect(submitted.locator("input[disabled]")).toHaveValue(input.name);

  const clientId = (await page.getByTestId("oauth-client-submitted-client-id").inputValue()).trim();
  expect(clientId.length).toBeGreaterThan(1);

  const secretLocator = page.getByTestId("oauth-client-submitted-client-secret");
  const clientSecret = input.enablePkce ? null : (await secretLocator.inputValue()).trim();

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

  await fillRedirectUris(details, input.redirectUris);

  await getOAuthClientDetailsWebsiteUrlInput(details).fill(input.websiteUrl);

  if (input.logoFileName) {
    await uploadOAuthClientLogo(page, input.logoFileName);
  }

  if (input.scopes) {
    await expandAllScopeCategories(page);
    for (const scope of OAUTH_SCOPES) {
      const scopeCheckbox = page.getByTestId(`oauth-scope-checkbox-${scope}`);
      const isChecked = await scopeCheckbox.evaluate((el) => el.hasAttribute("data-checked"));
      const shouldBeChecked = input.scopes.includes(scope);
      if (isChecked !== shouldBeChecked) {
        await scopeCheckbox.click();
      }
    }
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

  await page.getByTestId(`oauth-client-actions-${clientId}`).click();
  await page.getByTestId(`oauth-client-delete-${clientId}`).click();
  await expect(page.getByTestId("oauth-client-delete-confirm")).toBeVisible();

  const deleteResponsePromise = page.waitForResponse((res) =>
    res.url().includes("/api/trpc/oAuth/deleteClient")
  );
  await page.getByTestId("oauth-client-delete-confirm").click();
  const deleteResponse = await deleteResponsePromise;
  expect(deleteResponse.ok()).toBe(true);

  await expect(getOAuthClientList(page).getByText(expectedNameToDisappear)).toHaveCount(0);
  await expect(getOAuthClientListItem(page, clientId)).toHaveCount(0);
}

async function closeOAuthClientDetails(page: Page): Promise<void> {
  const details = getOAuthClientDetailsForm(page);
  if (!(await details.isVisible())) return;
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0, { timeout: 15_000 });
}

async function openOAuthClientDetails(page: Page, clientId: string): Promise<Locator> {
  const details = getOAuthClientDetailsForm(page);
  if (await details.isVisible()) {
    const visibleClientId = (await details.getByTestId("oauth-client-details-client-id").inputValue()).trim();
    if (visibleClientId === clientId) return details;

    await closeOAuthClientDetails(page);
  }

  await getOAuthClientListItem(page, clientId).click();
  await expect(details).toBeVisible();
  await expect(details.getByTestId("oauth-client-details-client-id")).toHaveValue(clientId);
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
  if (expected.redirectUris !== undefined)
    expect([...dbClient.redirectUris].sort()).toEqual([...expected.redirectUris].sort());
  if (expected.websiteUrl !== undefined) expect(dbClient.websiteUrl).toBe(expected.websiteUrl);
  if (expected.status !== undefined) expect(dbClient.status).toBe(expected.status);
  if (expected.clientType !== undefined)
    expect(dbClient.clientType as OAuthClientType).toBe(expected.clientType);

  if (expected.clientSecretsCount !== undefined) {
    expect(dbClient._count.clientSecrets).toBe(expected.clientSecretsCount);
  }

  if (expected.logo !== undefined) {
    if (typeof expected.logo === "object" && expected.logo?.kind === "truthy") {
      expect(dbClient.logo).toBeTruthy();
    } else {
      expect(dbClient.logo).toBe(expected.logo);
    }
  }

  if (expected.scopes !== undefined) {
    expect([...dbClient.scopes].sort()).toEqual([...expected.scopes].sort());
  }
}

async function expectOAuthClientDetails(
  details: Locator,
  expected: ExpectedOAuthClientDetails
): Promise<void> {
  await expect(details.getByTestId("oauth-client-details-status-badge")).toHaveText(expected.statusLabel);
  await expect(details.getByTestId("oauth-client-details-client-id")).toHaveValue(expected.clientId);
  await expect(getOAuthClientDetailsNameInput(details)).toHaveValue(expected.name);
  await expect(getOAuthClientDetailsPurposeInput(details)).toHaveValue(expected.purpose);

  await expectRedirectUriValues(details, expected.redirectUris);

  await expect(getOAuthClientDetailsWebsiteUrlInput(details)).toHaveValue(expected.websiteUrl);

  const pkceToggle = details.page().getByTestId("oauth-client-pkce-toggle");
  await expect(pkceToggle).toHaveAttribute(expected.pkceEnabled ? "data-checked" : "data-unchecked", "");

  await expect(details.locator('img[alt="Logo"][src]')).toHaveCount(expected.hasLogo ? 1 : 0);

  if (expected.scopes) {
    await expandAllScopeCategories(details.page());
    for (const scope of OAUTH_SCOPES) {
      const scopeCheckbox = details.page().getByTestId(`oauth-scope-checkbox-${scope}`);
      const shouldBeChecked = expected.scopes.includes(scope);
      if (shouldBeChecked) {
        await expect(scopeCheckbox).toHaveAttribute("data-checked", "");
      } else {
        await expect(scopeCheckbox).toHaveAttribute("data-unchecked", "");
      }
    }
  }
}

async function expectRedirectUriValues(container: Locator, expectedUris: string[]): Promise<void> {
  for (let i = 0; i < expectedUris.length; i++) {
    await expect(container.locator(`#redirectUri-${i}`)).toHaveValue(expectedUris[i]);
  }
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

    await page.getByTestId("open-oauth-client-create-dialog").click();

    const form = page.getByTestId("oauth-client-create-form");
    await expect(form).toBeVisible();

    // Submit immediately - should trigger react-hook-form validation errors
    // (Base UI Form uses noValidate, so native browser validation is disabled)
    await page.getByTestId("oauth-client-create-submit").click();

    // Expect field error messages to be visible for required fields
    // FieldError test IDs follow the pattern "field-error-{fieldName}"
    const fieldErrors = form.locator('[data-testid^="field-error-"]');
    await expect(fieldErrors.first()).toBeVisible();

    const nameInput = form.locator("#name");
    const purposeInput = form.locator("#purpose");

    // Fill name, submit -> purpose should be flagged
    await nameInput.fill("Test OAuth Client");
    await page.getByTestId("oauth-client-create-submit").click();
    await expect(fieldErrors.first()).toBeVisible();

    // Fill purpose, submit -> redirect URI should be flagged
    await purposeInput.fill("Test purpose");
    await page.getByTestId("oauth-client-create-submit").click();
    await expect(page.locator('[data-type="error"]').first()).toBeVisible();
  });

  test("creates a private (confidential) OAuth client with minimal fields; submitted modal shows id+secret; list/details/DB reflect values", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;
    const clientName = `${testPrefix}private-minimal-${Date.now()}`;
    const purpose = "Used for E2E testing (minimal)";
    const redirectUris = ["https://example.com/callback"];
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId, clientSecret } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUris,
      enablePkce: false,
      scopes,
    });
    expect(clientSecret?.length).toBeGreaterThan(1);

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: false,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl: null,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecretsCount: 1,
      logo: null,
      scopes,
    });

    const editedName = `${testPrefix}private-minimal-edited-${Date.now()}`;
    const editedPurpose = "Updated purpose (minimal)";
    const editedRedirectUris = ["https://example.com/updated-callback"];
    const editedWebsiteUrl = "https://updated.example.com";

    await updateOAuthClient(page, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      logoFileName: "cal2.png",
    });

    const editedDetails = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetails, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
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
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecretsCount: 1,
      logo: TRUTHY,
    });

    await deleteOAuthClient(page, clientId, editedName);

    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("editing redirect URIs of an approved client does NOT trigger reapproval", async ({
    page,
    prisma,
    users,
  }, testInfo) => {
    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;

    const user = await users.create();
    await user.apiLogin("/settings/developer/oauth");

    const clientName = `${testPrefix}approved-client-${Date.now()}`;
    const clientId = `${testPrefix.replaceAll("-", "")}approved${Date.now()}`;

    const initialRedirectUris = ["https://example.com/approved-callback"];

    await prisma.oAuthClient.create({
      data: {
        clientId,
        name: clientName,
        purpose: "Approved client for redirectUri reapproval test",
        redirectUris: initialRedirectUris,
        websiteUrl: null,
        logo: null,
        clientType: "PUBLIC",
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
      redirectUris: initialRedirectUris,
      websiteUrl: "",
      statusLabel: "Approved",
      pkceEnabled: true,
      hasLogo: false,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      status: "APPROVED",
      redirectUris: initialRedirectUris,
      clientType: "PUBLIC",
      clientSecretsCount: 0,
    });

    const updatedRedirectUris = [`https://example.com/approved-updated-${Date.now()}`];

    await fillRedirectUris(detailsBeforeUpdate, updatedRedirectUris);

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
      redirectUris: updatedRedirectUris,
      websiteUrl: "",
      statusLabel: "Approved",
      pkceEnabled: true,
      hasLogo: false,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      status: "APPROVED",
      redirectUris: updatedRedirectUris,
      clientType: "PUBLIC",
      clientSecretsCount: 0,
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
    const redirectUris = ["https://example.com/callback"];
    const websiteUrl = "https://example.com";
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId, clientSecret } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl,
      enablePkce: false,
      logoFileName: "cal.png",
      scopes,
    });
    expect(clientSecret?.length).toBeGreaterThan(1);

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecretsCount: 1,
      logo: TRUTHY,
      scopes,
    });

    const editedName = `${testPrefix}private-edited-${Date.now()}`;
    const editedPurpose = "Updated purpose (full private)";
    const editedRedirectUris = ["https://example.com/full-private-updated"];
    const editedWebsiteUrl = "https://full-private.example.com";

    await updateOAuthClient(page, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      logoFileName: "cal2.png",
    });

    const editedDetails = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetails, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
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
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: false,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      status: "PENDING",
      clientType: "CONFIDENTIAL",
      clientSecretsCount: 1,
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
    const redirectUris = ["https://example.com/callback"];
    const websiteUrl = "https://example.com";
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl,
      enablePkce: true,
      scopes,
    });

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl,
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl,
      status: "PENDING",
      clientType: "PUBLIC",
      clientSecretsCount: 0,
      logo: null,
      scopes,
    });

    const editedName = `${testPrefix}public-edited-${Date.now()}`;
    const editedPurpose = "Updated purpose (public)";
    const editedRedirectUris = ["https://example.com/public-updated"];
    const editedWebsiteUrl = "https://public-updated.example.com";

    await updateOAuthClient(page, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      logoFileName: "cal2.png",
    });

    const editedDetails = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(editedDetails, {
      clientId,
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
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
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: true,
    });
    await closeOAuthClientDetails(page);

    await expectOAuthClientInDb(prisma, clientId, {
      name: editedName,
      purpose: editedPurpose,
      redirectUris: editedRedirectUris,
      websiteUrl: editedWebsiteUrl,
      status: "PENDING",
      clientType: "PUBLIC",
      clientSecretsCount: 0,
      logo: TRUTHY,
    });

    await deleteOAuthClient(page, clientId, editedName);

    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("creates OAuth client with single scope correctly stored in database", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;
    const clientName = `${testPrefix}single-scope-${Date.now()}`;
    const purpose = "Testing single scope selection";
    const redirectUris = ["https://example.com/single-scope-callback"];
    const selectedScope: AccessScope = "BOOKING_READ";

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUris,
      enablePkce: true,
      scopes: [selectedScope],
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUris,
      status: "PENDING",
      clientType: "PUBLIC",
      scopes: [selectedScope],
    });

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("creates OAuth client with all scopes correctly stored in database", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;
    const clientName = `${testPrefix}all-scopes-${Date.now()}`;
    const purpose = "Testing all scopes selection";
    const redirectUris = ["https://example.com/all-scopes-callback"];
    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUris,
      enablePkce: true,
      scopes: [...OAUTH_SCOPES],
    });

    await expectOAuthClientInDb(prisma, clientId, {
      name: clientName,
      purpose,
      redirectUris,
      status: "PENDING",
      clientType: "PUBLIC",
      scopes: [...OAUTH_SCOPES],
    });

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("updates OAuth client scopes correctly; UI checkboxes reflect state; DB stores updated scopes", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-creation-${testInfo.testId}-`;
    const clientName = `${testPrefix}update-scopes-${Date.now()}`;
    const purpose = "Testing scope updates";
    const redirectUris = ["https://example.com/update-scopes-callback"];
    const initialScopes: AccessScope[] = ["EVENT_TYPE_READ", "BOOKING_READ"];

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose,
      redirectUris,
      enablePkce: true,
      scopes: initialScopes,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      scopes: initialScopes,
    });

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
      scopes: initialScopes,
    });
    await closeOAuthClientDetails(page);

    const updatedScopes: AccessScope[] = ["SCHEDULE_READ", "SCHEDULE_WRITE", "PROFILE_READ"];

    await updateOAuthClient(page, {
      clientId,
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl: "",
      scopes: updatedScopes,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      scopes: updatedScopes,
    });

    const detailsAfterUpdate = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(detailsAfterUpdate, {
      clientId,
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
      scopes: updatedScopes,
    });
    await closeOAuthClientDetails(page);

    await page.reload();

    const detailsAfterReload = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(detailsAfterReload, {
      clientId,
      name: clientName,
      purpose,
      redirectUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
      scopes: updatedScopes,
    });
    await closeOAuthClientDetails(page);

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });
});

test.describe("OAuth client multiple redirect URIs", () => {
  test.afterEach(async ({ users, prisma }, testInfo) => {
    const testPrefix = `e2e-oauth-redirect-uris-${testInfo.testId}-`;

    await prisma.oAuthClient.deleteMany({
      where: {
        name: {
          startsWith: testPrefix,
        },
      },
    });

    await users.deleteAll();
  });

  test("creates client with 3 redirect URIs; all are correctly stored in DB and displayed in details", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-redirect-uris-${testInfo.testId}-`;
    const clientName = `${testPrefix}multi-uri-${Date.now()}`;
    const redirectUris = [
      "https://example.com/callback",
      "https://staging.example.com/callback",
      "https://dev.example.com/callback",
    ];
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Testing multiple redirect URIs",
      redirectUris,
      enablePkce: true,
      scopes,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      redirectUris,
    });

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose: "Testing multiple redirect URIs",
      redirectUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });
    await closeOAuthClientDetails(page);

    await page.reload();

    const detailsAfterReload = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(detailsAfterReload, {
      clientId,
      name: clientName,
      purpose: "Testing multiple redirect URIs",
      redirectUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });
    await closeOAuthClientDetails(page);

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("can delete a redirect URI and DB/UI update correctly", async ({ page, prisma }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-redirect-uris-${testInfo.testId}-`;
    const clientName = `${testPrefix}delete-uri-${Date.now()}`;
    const initialUris = [
      "https://example.com/callback-1",
      "https://example.com/callback-2",
      "https://example.com/callback-3",
    ];
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Testing redirect URI deletion",
      redirectUris: initialUris,
      enablePkce: true,
      scopes,
    });

    const remainingUris = ["https://example.com/callback-1", "https://example.com/callback-3"];

    await updateOAuthClient(page, {
      clientId,
      name: clientName,
      purpose: "Testing redirect URI deletion",
      redirectUris: remainingUris,
      websiteUrl: "",
    });

    await expectOAuthClientInDb(prisma, clientId, {
      redirectUris: remainingUris,
    });

    await page.reload();

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose: "Testing redirect URI deletion",
      redirectUris: remainingUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });
    await closeOAuthClientDetails(page);

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("cannot add more than 10 redirect URIs; button shows limit message", async ({ page }, _testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    await page.getByTestId("open-oauth-client-create-dialog").click();

    const form = getOAuthClientCreateForm(page);
    await expect(form).toBeVisible();

    for (let i = 1; i < MAX_REDIRECT_URIS; i++) {
      const addButton = form.locator('button:has-text("Add redirect URI")');
      await expect(addButton).toBeEnabled();
      await addButton.click();
    }

    const addButton = form.locator(
      `button:has-text("Maximum of ${MAX_REDIRECT_URIS} redirect URIs allowed")`
    );
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeDisabled();

    await expect(form.locator(`#redirectUri-${MAX_REDIRECT_URIS - 1}`)).toBeVisible();
    await expect(form.locator(`#redirectUri-${MAX_REDIRECT_URIS}`)).toHaveCount(0);
  });

  test("accepts HTTP redirect URIs for loopback addresses and .local domains", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-redirect-uris-${testInfo.testId}-`;
    const clientName = `${testPrefix}loopback-${Date.now()}`;
    const redirectUris = [
      "http://localhost:3000/callback",
      "http://127.0.0.1:3000/callback",
      "http://[::1]:3000/callback",
      "http://app.cal.local:3000/callback",
    ];
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Testing loopback redirect URIs",
      redirectUris,
      enablePkce: true,
      scopes,
    });

    await expectOAuthClientInDb(prisma, clientId, {
      redirectUris,
    });

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose: "Testing loopback redirect URIs",
      redirectUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });
    await closeOAuthClientDetails(page);

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("shows validation error for HTTP redirect URIs on non-local domains", async ({ page }) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    await page.getByTestId("open-oauth-client-create-dialog").click();

    const form = getOAuthClientCreateForm(page);
    await expect(form).toBeVisible();

    await getOAuthClientCreateNameInput(form).fill("Test Invalid URI");
    await getOAuthClientCreatePurposeInput(form).fill("Testing validation");

    const redirectUriInput = form.locator("#redirectUri-0");
    await redirectUriInput.fill("http://example.com/callback");

    await expandAllScopeCategories(page);
    await page.getByTestId("oauth-scope-checkbox-BOOKING_READ").click();

    await page.getByTestId("oauth-client-create-submit").click();

    const errorMessage = form.locator("[data-slot='field-error']", {
      hasText: "HTTPS is required",
    });
    await expect(errorMessage).toBeVisible();
  });

  test("shows validation error for duplicate redirect URIs", async ({ page }) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    await page.getByTestId("open-oauth-client-create-dialog").click();

    const form = getOAuthClientCreateForm(page);
    await expect(form).toBeVisible();

    await getOAuthClientCreateNameInput(form).fill("Test Duplicate URI");
    await getOAuthClientCreatePurposeInput(form).fill("Testing duplicate validation");

    await form.locator("#redirectUri-0").fill("https://example.com/callback");

    await form.locator('button:has-text("Add redirect URI")').click();
    await form.locator("#redirectUri-1").fill("https://example.com/callback");

    await expandAllScopeCategories(page);
    await page.getByTestId("oauth-scope-checkbox-BOOKING_READ").click();

    await page.getByTestId("oauth-client-create-submit").click();

    const errorMessage = form.locator("[data-slot='field-error']").filter({
      hasText: "already added",
    });
    await expect(errorMessage.first()).toBeVisible();
  });

  test("can add a redirect URI to an existing client", async ({ page, prisma }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-redirect-uris-${testInfo.testId}-`;
    const clientName = `${testPrefix}add-uri-${Date.now()}`;
    const initialUris = ["https://example.com/callback"];
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Testing adding redirect URIs",
      redirectUris: initialUris,
      enablePkce: true,
      scopes,
    });

    const expandedUris = ["https://example.com/callback", "https://staging.example.com/callback"];

    await updateOAuthClient(page, {
      clientId,
      name: clientName,
      purpose: "Testing adding redirect URIs",
      redirectUris: expandedUris,
      websiteUrl: "",
    });

    await expectOAuthClientInDb(prisma, clientId, {
      redirectUris: expandedUris,
    });

    await page.reload();

    const details = await openOAuthClientDetails(page, clientId);
    await expectOAuthClientDetails(details, {
      clientId,
      name: clientName,
      purpose: "Testing adding redirect URIs",
      redirectUris: expandedUris,
      websiteUrl: "",
      statusLabel: "Pending",
      pkceEnabled: true,
      hasLogo: false,
    });
    await closeOAuthClientDetails(page);

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("empty redirect URI fields are ignored on save; only filled URIs are stored", async ({
    page,
    prisma,
  }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-redirect-uris-${testInfo.testId}-`;
    const clientName = `${testPrefix}empty-fields-${Date.now()}`;
    const _scopes: AccessScope[] = ["BOOKING_READ"];

    await page.getByTestId("open-oauth-client-create-dialog").click();

    const form = getOAuthClientCreateForm(page);
    await getOAuthClientCreateNameInput(form).fill(clientName);
    await getOAuthClientCreatePurposeInput(form).fill("Testing empty field handling");

    await form.locator("#redirectUri-0").fill("https://example.com/callback");

    await clickAddRedirectUri(form);
    await clickAddRedirectUri(form);
    await clickAddRedirectUri(form);

    await expect(getRedirectUriInput(form, 3)).toBeVisible();

    await expandAllScopeCategories(page);
    await page.getByTestId("oauth-scope-checkbox-BOOKING_READ").click();

    await page.getByTestId("oauth-client-create-submit").click();

    const submitted = getOAuthClientSubmittedModal(page);
    await expect(submitted).toBeVisible();

    const clientId = (await page.getByTestId("oauth-client-submitted-client-id").inputValue()).trim();
    await page.getByTestId("oauth-client-submitted-done").click();

    await expectOAuthClientInDb(prisma, clientId, {
      redirectUris: ["https://example.com/callback"],
    });

    const details = await openOAuthClientDetails(page, clientId);
    await expect(details.locator("#redirectUri-0")).toHaveValue("https://example.com/callback");
    await expect(details.locator("#redirectUri-1")).toHaveCount(0);
    await closeOAuthClientDetails(page);

    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });

  test("cannot create client when all redirect URI fields are empty", async ({ page }) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    await page.getByTestId("open-oauth-client-create-dialog").click();

    const form = getOAuthClientCreateForm(page);
    await expect(form).toBeVisible();

    await getOAuthClientCreateNameInput(form).fill("Test No URIs");
    await getOAuthClientCreatePurposeInput(form).fill("Testing empty URI validation");

    await form.locator("#redirectUri-0").fill("https://example.com/callback");

    await clickAddRedirectUri(form);
    await expect(getRedirectUriInput(form, 1)).toBeVisible();

    await getRedirectUriTrashButton(form, 0).click();

    await expandAllScopeCategories(page);
    await page.getByTestId("oauth-scope-checkbox-BOOKING_READ").click();

    await page.getByTestId("oauth-client-create-submit").click();

    await expect(page.locator('[data-type="error"]').first()).toContainText(
      "At least one redirect URI is required"
    );
    await expect(getOAuthClientSubmittedModal(page)).toHaveCount(0);
  });

  test("cannot update client to have zero redirect URIs", async ({ page, prisma }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-redirect-uris-${testInfo.testId}-`;
    const clientName = `${testPrefix}zero-uris-${Date.now()}`;
    const scopes: AccessScope[] = ["BOOKING_READ"];

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Testing zero URI update validation",
      redirectUris: ["https://example.com/callback"],
      enablePkce: true,
      scopes,
    });

    const details = await openOAuthClientDetails(page, clientId);

    await clickAddRedirectUri(details);
    await expect(getRedirectUriInput(details, 1)).toBeVisible();

    await getRedirectUriTrashButton(details, 0).click();

    await page.getByTestId("oauth-client-details-save").click();

    await expect(page.locator('[data-type="error"]').first()).toContainText(
      "At least one redirect URI is required"
    );

    await expectOAuthClientInDb(prisma, clientId, {
      redirectUris: ["https://example.com/callback"],
    });

    await closeOAuthClientDetails(page);
    await deleteOAuthClient(page, clientId, clientName);
    await expectOAuthClientDeletedInDb(prisma, clientId);
  });
});

test.describe("OAuth client secrets", () => {
  test.afterEach(async ({ users, prisma }, testInfo) => {
    const testPrefix = `e2e-oauth-client-secrets-${testInfo.testId}-`;

    await prisma.oAuthClient.deleteMany({
      where: { name: { startsWith: testPrefix } },
    });

    await users.deleteAll();
  });

  test("cannot delete the only secret of a confidential client", async ({ page, prisma }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-secrets-${testInfo.testId}-`;
    const clientName = `${testPrefix}single-secret-${Date.now()}`;

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Test single secret delete prevention",
      redirectUris: ["https://example.com/callback"],
      enablePkce: false,
      scopes: ["BOOKING_READ"],
    });

    const details = await openOAuthClientDetails(page, clientId);

    const secretsSection = details.getByTestId("oauth-client-secrets-section");
    await expect(secretsSection).toBeVisible();

    const secretRows = secretsSection.locator("[data-testid^='oauth-client-secret-row-']");
    await expect(secretRows).toHaveCount(1);

    const deleteButtons = secretsSection.locator("[data-testid^='oauth-client-secret-delete-']");
    await expect(deleteButtons).toHaveCount(0);

    await expectOAuthClientInDb(prisma, clientId, {
      clientSecretsCount: 1,
      clientType: "CONFIDENTIAL",
    });
  });

  test("cannot create a third secret when 2 already exist", async ({ page, prisma }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-secrets-${testInfo.testId}-`;
    const clientName = `${testPrefix}max-secrets-${Date.now()}`;

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Test max secrets limit",
      redirectUris: ["https://example.com/callback"],
      enablePkce: false,
      scopes: ["BOOKING_READ"],
    });

    const details = await openOAuthClientDetails(page, clientId);
    const secretsSection = details.getByTestId("oauth-client-secrets-section");
    await expect(secretsSection).toBeVisible();

    const generateButton = secretsSection.getByTestId("oauth-client-generate-secret");
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled();

    const createResponsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/trpc/oAuth/createClientSecret")
    );
    await generateButton.click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await page.getByTestId("oauth-client-new-secret-done").click();

    const secretRows = secretsSection.locator("[data-testid^='oauth-client-secret-row-']");
    await expect(secretRows).toHaveCount(2);

    const deleteButtons = secretsSection.locator("[data-testid^='oauth-client-secret-delete-']");
    await expect(deleteButtons).toHaveCount(2);

    await expect(generateButton).toHaveCount(0);
    await expect(secretsSection.getByTestId("oauth-client-max-secrets-reached")).toBeVisible();

    await expectOAuthClientInDb(prisma, clientId, {
      clientSecretsCount: 2,
      clientType: "CONFIDENTIAL",
    });
  });

  test("can delete one of two secrets and only one remains", async ({ page, prisma }, testInfo) => {
    await loginAsSeededAdminAndGoToOAuthSettings(page);

    const testPrefix = `e2e-oauth-client-secrets-${testInfo.testId}-`;
    const clientName = `${testPrefix}delete-secret-${Date.now()}`;

    const { clientId } = await createOAuthClient(page, {
      name: clientName,
      purpose: "Test secret deletion",
      redirectUris: ["https://example.com/callback"],
      enablePkce: false,
      scopes: ["BOOKING_READ"],
    });

    const details = await openOAuthClientDetails(page, clientId);
    const secretsSection = details.getByTestId("oauth-client-secrets-section");
    await expect(secretsSection).toBeVisible();

    const generateButton = secretsSection.getByTestId("oauth-client-generate-secret");
    const createResponsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/trpc/oAuth/createClientSecret")
    );
    await generateButton.click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await page.getByTestId("oauth-client-new-secret-done").click();

    const secretRows = secretsSection.locator("[data-testid^='oauth-client-secret-row-']");
    await expect(secretRows).toHaveCount(2);

    const deleteButtons = secretsSection.locator("[data-testid^='oauth-client-secret-delete-']");
    await expect(deleteButtons).toHaveCount(2);

    await deleteButtons.first().click();

    await expect(page.getByTestId("oauth-client-secret-delete-confirm")).toBeVisible();

    const deleteResponsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/trpc/oAuth/deleteClientSecret")
    );
    await page.getByTestId("oauth-client-secret-delete-confirm").click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok()).toBe(true);

    await expect(secretRows).toHaveCount(1);
    await expect(deleteButtons).toHaveCount(0);
    await expect(generateButton).toBeVisible();

    await expectOAuthClientInDb(prisma, clientId, {
      clientSecretsCount: 1,
      clientType: "CONFIDENTIAL",
    });
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

function getOAuthClientCreateWebsiteUrlInput(form: Locator): Locator {
  return form.locator("#websiteUrl");
}

function getOAuthClientDetailsNameInput(details: Locator): Locator {
  return details.locator("#name");
}

function getOAuthClientDetailsPurposeInput(details: Locator): Locator {
  return details.locator("#purpose");
}

function getOAuthClientDetailsWebsiteUrlInput(details: Locator): Locator {
  return details.locator("#websiteUrl");
}
