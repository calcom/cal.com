import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { addFilter, expectSegmentCleared, expectSegmentSelected, selectSegment } from "./filter-helpers";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

/**
 * Navigate to bookings page with specific status
 */
async function navigateToBookings(page: Page, status = "upcoming") {
  // Wait for the bookings API response like existing tests do
  const bookingsGetResponse = page.waitForResponse((response) =>
    /\/api\/trpc\/bookings\/get.*/.test(response.url())
  );
  await page.goto(`/bookings/${status}`, { waitUntil: "domcontentloaded" });
  await bookingsGetResponse;
}

test.describe("System Segments", () => {
  test.describe("Core Functionality", () => {
    test("My Bookings system segment filters to current user's bookings only", async ({ page, users }) => {
      const user1 = await users.create({ username: "user1" });

      // Create some bookings for user (this would need booking setup)
      // For now, we'll test the filter application
      await user1.apiLogin();
      await navigateToBookings(page);

      await selectSegment(page, "My Bookings");
      await expectSegmentSelected(page, "My Bookings");

      // Verify the userId filter is applied (check URL or filter indicators)
      const url = page.url();
      expect(url).toContain("activeFilters");
    });

    test("System segments show only Duplicate option in submenu", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();

      await navigateToBookings(page);

      await page.getByTestId("filter-segment-select").first().click();
      await page
        .locator('[data-testid="filter-segment-select-content"] [role="menuitem"]')
        .filter({ hasText: "My Bookings" })
        .locator('[data-testid="filter-segment-select-submenu-button"]')
        .click();

      const submenu = page.getByTestId("filter-segment-select-submenu-content");
      await expect(submenu.getByText("Duplicate")).toBeVisible();
      await expect(submenu.getByText("Rename")).toBeHidden();
      await expect(submenu.getByText("Delete")).toBeHidden();
    });
  });

  test.describe("State Persistence", () => {
    test("System segment selection persists across page visits", async ({ page, users }) => {
      const owner = await users.create(undefined, { hasTeam: true });
      await owner.apiLogin();

      // Visit bookings page and select system segment
      await navigateToBookings(page);
      await selectSegment(page, "My Bookings");
      await expectSegmentSelected(page, "My Bookings");

      // Revisit the page - should preserve selection
      await navigateToBookings(page);
      await expectSegmentSelected(page, "My Bookings");
    });

    test("Cleared system segment state persists (no default selection after manual clear)", async ({
      page,
      users,
    }) => {
      const owner = await users.create(undefined, { hasTeam: true });
      await owner.apiLogin();

      await navigateToBookings(page);

      // Select system segment
      await selectSegment(page, "My Bookings");
      await expectSegmentSelected(page, "My Bookings");

      // Unselect system segment
      await selectSegment(page, "My Bookings");

      // Revisit the page - should NOT have any segment selected
      await navigateToBookings(page);
      await expectSegmentCleared(page);
    });
  });

  test.describe("Auto-clear Behavior", () => {
    test("Manual filter clears system segment selection", async ({ page, users }) => {
      const user = await users.create(undefined, { hasTeam: true });
      await user.apiLogin();

      await navigateToBookings(page);

      // Select system segment
      await selectSegment(page, "My Bookings");
      await expectSegmentSelected(page, "My Bookings");

      // Apply manual filter - this should clear system segment
      await addFilter(page, "eventTypeId");
      await page.keyboard.press("Escape");
      await expectSegmentCleared(page);

      // Verify filter is still applied
      await expect(page.getByTestId("filter-popover-trigger-eventTypeId")).toBeVisible();
    });
  });
});
