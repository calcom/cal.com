import type { PrismaClient } from "@calcom/prisma";
import { expect, type Page } from "@playwright/test";
import { test } from "../lib/fixtures";
import {
  closeOAuthClientDetails,
  createPendingOAuthClient,
  goToAdminOAuthSettings,
  openOAuthClientDetailsFromList,
} from "./oauth-client-helpers";

async function expectClientStatusInDb(
  prisma: PrismaClient,
  clientId: string,
  status: "PENDING" | "APPROVED" | "REJECTED"
) {
  await expect
    .poll(async () => {
      const row = await prisma.oAuthClient.findUnique({
        where: { clientId },
        select: { status: true },
      });

      return row?.status ?? null;
    })
    .toBe(status);
}

async function waitForAdminSection(page: Page, sectionTestId: string) {
  const section = page.getByTestId(sectionTestId);
  await expect(section).toBeVisible({ timeout: 60_000 });
  return section;
}

async function expectClientInAdminSection(
  page: Page,
  sectionTestId: string,
  clientId: string
): Promise<void> {
  const section = await waitForAdminSection(page, sectionTestId);
  await expect(section.getByTestId(`oauth-client-list-item-${clientId}`)).toBeVisible({ timeout: 60_000 });
}

async function expectClientNotInAdminSection(
  page: Page,
  sectionTestId: string,
  clientId: string
): Promise<void> {
  const section = await waitForAdminSection(page, sectionTestId);
  await expect(section.getByTestId(`oauth-client-list-item-${clientId}`)).toHaveCount(0, { timeout: 60_000 });
}

test.describe.configure({ mode: "parallel" });

test.describe("OAuth clients admin", () => {
  test.afterEach(async ({ users, prisma }, testInfo) => {
    const testPrefix = `e2e-oauth-client-admin-${testInfo.testId}-`;

    await prisma.oAuthClient.deleteMany({
      where: {
        name: {
          startsWith: testPrefix,
        },
      },
    });

    await users.deleteAll();
  });

  test("can manage pending/approved/rejected clients and can create approved clients as admin", async ({
    page,
    prisma,
    users,
  }, testInfo) => {
    const adminUser = await users.create({ role: "ADMIN" });
    await adminUser.apiLogin();

    const testPrefix = `e2e-oauth-client-admin-${testInfo.testId}-`;

    const makeClientInput = (name: string) => ({
      name,
      purpose: "Used for E2E testing (admin)",
      redirectUri: "https://example.com/callback",
      websiteUrl: "https://example.com",
      logoFileName: "cal.png",
    });

    const pending1Name = `${testPrefix}pending-1-${Date.now()}`;
    const pending2Name = `${testPrefix}pending-2-${Date.now()}`;
    const pending3Name = `${testPrefix}pending-3-${Date.now()}`;

    const toBeApproved = await createPendingOAuthClient(page, makeClientInput(pending1Name));
    const toBeRejected = await createPendingOAuthClient(page, makeClientInput(pending2Name));
    const staysPending = await createPendingOAuthClient(page, makeClientInput(pending3Name));

    await goToAdminOAuthSettings(page);

    await expectClientInAdminSection(page, "oauth-client-admin-pending-section", toBeApproved.clientId);
    await expectClientInAdminSection(page, "oauth-client-admin-pending-section", toBeRejected.clientId);
    await expectClientInAdminSection(page, "oauth-client-admin-pending-section", staysPending.clientId);

    // Preview a pending client (readonly)
    const pendingDetails = await openOAuthClientDetailsFromList(page, toBeApproved.clientId);

    await expect(pendingDetails.locator("#name")).toBeDisabled();
    await expect(pendingDetails.locator("#purpose")).toBeDisabled();
    await expect(pendingDetails.locator("#redirectUri")).toBeDisabled();
    await expect(pendingDetails.locator("#websiteUrl")).toBeDisabled();

    // Upload/delete actions should be hidden for admin view
    await expect(page.getByTestId("open-upload-oauth-client-logo-dialog")).toHaveCount(0);
    await expect(page.getByTestId("oauth-client-details-delete-trigger")).toHaveCount(0);

    // Approve pending1
    await page.getByTestId("oauth-client-details-approve-trigger").click();
    await closeOAuthClientDetails(page);

    await expectClientStatusInDb(prisma, toBeApproved.clientId, "APPROVED");

    await expectClientNotInAdminSection(page, "oauth-client-admin-pending-section", toBeApproved.clientId);
    await expectClientInAdminSection(page, "oauth-client-admin-approved-section", toBeApproved.clientId);
    await expectClientInAdminSection(page, "oauth-client-admin-pending-section", staysPending.clientId);

    // Reject pending2
    const rejectionReason = `Not acceptable (${testPrefix}reason-${Date.now()})`;
    await openOAuthClientDetailsFromList(page, toBeRejected.clientId);
    await page.getByTestId("oauth-client-details-reject-trigger").click();
    await page.getByTestId("oauth-client-details-rejection-reason").fill(rejectionReason);
    await page.getByTestId("oauth-client-details-reject-confirm").click();
    await closeOAuthClientDetails(page);

    await expectClientStatusInDb(prisma, toBeRejected.clientId, "REJECTED");

    await expectClientNotInAdminSection(page, "oauth-client-admin-pending-section", toBeRejected.clientId);
    await expectClientInAdminSection(page, "oauth-client-admin-rejected-section", toBeRejected.clientId);
    await expect(page.getByTestId("toast-success").first()).toBeVisible();
    await page.reload();

    await page
      .getByTestId("oauth-client-admin-rejected-section")
      .getByTestId(`oauth-client-list-item-${toBeRejected.clientId}`)
      .click();

    const rejectedDetails = page.getByTestId("oauth-client-details-form");
    await expect(rejectedDetails).toBeVisible();
    await expect(rejectedDetails.getByTestId("oauth-client-details-rejection-reason-display")).toContainText(
      rejectionReason
    );
    await closeOAuthClientDetails(page);
    await expectClientInAdminSection(page, "oauth-client-admin-pending-section", staysPending.clientId);

    // Reload to ensure list queries show consistent counts
    await page.reload();

    await expectClientInAdminSection(page, "oauth-client-admin-approved-section", toBeApproved.clientId);
    await expectClientInAdminSection(page, "oauth-client-admin-rejected-section", toBeRejected.clientId);
    await expectClientInAdminSection(page, "oauth-client-admin-pending-section", staysPending.clientId);
  });
});
