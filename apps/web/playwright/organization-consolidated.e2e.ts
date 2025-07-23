import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Organization Management", () => {
  test("Should be able to create an organization", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await expect(page.locator('[data-testid="organization-created"]')).toBeVisible();
  });

  test("Should be able to invite members to organization", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await page.goto("/settings/organizations/members");
    await page.locator('[data-testid="invite-member"]').click();
    await page.locator('[name="email"]').fill("member@example.com");
    await page.locator('[data-testid="send-invitation"]').click();

    await expect(page.locator('[data-testid="invitation-sent"]')).toBeVisible();
  });

  test("Should handle organization booking flow", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Org Event");
    await page.locator("[name=slug]").fill("org-event");
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto("/org/test-org/org-event");
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });

  test("Should manage organization teams", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await page.goto("/settings/organizations/teams");
    await page.locator('[data-testid="create-team"]').click();
    await page.locator('[name="name"]').fill("Test Team");
    await page.locator('[data-testid="save-team"]').click();

    await expect(page.locator('[data-testid="team-created"]')).toBeVisible();
  });

  test("Should handle organization settings", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await page.goto("/settings/organizations/profile");
    await page.locator('[name="name"]').fill("Updated Organization");
    await page.locator('[data-testid="save-organization"]').click();

    await expect(page.locator('[data-testid="organization-updated"]')).toBeVisible();
  });
});

test.describe("Organization Attributes", () => {
  test("Should manage organization attributes", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await page.goto("/settings/organizations/attributes");
    await page.locator('[data-testid="add-attribute"]').click();
    await page.locator('[name="name"]').fill("Department");
    await page.locator('[name="type"]').selectOption("text");
    await page.locator('[data-testid="save-attribute"]').click();

    await expect(page.locator('[data-testid="attribute-created"]')).toBeVisible();
  });

  test("Should assign attributes to members", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await page.goto("/settings/organizations/attributes");
    await page.locator('[data-testid="add-attribute"]').click();
    await page.locator('[name="name"]').fill("Department");
    await page.locator('[name="type"]').selectOption("text");
    await page.locator('[data-testid="save-attribute"]').click();

    await page.goto("/settings/organizations/members");
    await page.locator('[data-testid="member-settings"]').first().click();
    await page.locator('[name="Department"]').fill("Engineering");
    await page.locator('[data-testid="save-member"]').click();

    await expect(page.locator('[data-testid="member-updated"]')).toBeVisible();
  });
});

test.describe("Organization Workflows", () => {
  test("Should create organization-wide workflows", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/organizations/new");
    await page.locator('[name="name"]').fill("Test Organization");
    await page.locator('[name="slug"]').fill("test-org");
    await page.locator('[data-testid="create-organization"]').click();

    await page.goto("/settings/organizations/workflows");
    await page.locator('[data-testid="new-workflow"]').click();
    await page.locator('[name="name"]').fill("Org Workflow");
    await page.locator('[data-testid="create-workflow"]').click();

    await expect(page.locator('[data-testid="workflow-created"]')).toBeVisible();
  });
});
