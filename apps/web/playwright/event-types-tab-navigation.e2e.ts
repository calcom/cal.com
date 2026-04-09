import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { createNewUserEventType, gotoFirstEventType } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Event Types Tab Navigation", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("should navigate between all tabs and render correct content", async ({ page }) => {
    await gotoFirstEventType(page);

    // Verify we start on the setup/basics tab
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("event-title")).toBeVisible();

    // Navigate to Availability tab
    await page.click("[data-testid=vertical-tab-availability]");
    await expect(page.getByTestId("vertical-tab-availability")).toHaveAttribute("aria-current", "page");

    // Navigate to Limits tab
    await page.click("[data-testid=vertical-tab-event_limit_tab_title]");
    await expect(page.getByTestId("vertical-tab-event_limit_tab_title")).toHaveAttribute(
      "aria-current",
      "page"
    );

    // Navigate to Recurring tab
    await page.click("[data-testid=vertical-tab-recurring]");
    await expect(page.getByTestId("vertical-tab-recurring")).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-testid=recurring-event-check]")).toBeVisible();

    // Navigate to Advanced tab
    await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
    await expect(page.getByTestId("vertical-tab-event_advanced_tab_title")).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.locator("[data-testid=requires-confirmation]")).toBeVisible();

    // Navigate to Apps tab
    await page.click("[data-testid=vertical-tab-apps]");
    await expect(page.getByTestId("vertical-tab-apps")).toHaveAttribute("aria-current", "page");

    // Navigate to Webhooks tab
    await page.click("[data-testid=vertical-tab-webhooks]");
    await expect(page.getByTestId("vertical-tab-webhooks")).toHaveAttribute("aria-current", "page");

    // Navigate back to Basics tab
    await page.click("[data-testid=vertical-tab-basics]");
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("event-title")).toBeVisible();
  });

  test("should update URL query parameter when switching tabs", async ({ page }) => {
    await gotoFirstEventType(page);

    // Verify initial tab
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");

    // Click Availability tab and verify URL updates
    await page.click("[data-testid=vertical-tab-availability]");
    await expect(page).toHaveURL(/tabName=availability/);

    // Click Limits tab and verify URL updates
    await page.click("[data-testid=vertical-tab-event_limit_tab_title]");
    await expect(page).toHaveURL(/tabName=limits/);

    // Click Advanced tab and verify URL updates
    await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
    await expect(page).toHaveURL(/tabName=advanced/);

    // Click Recurring tab and verify URL updates
    await page.click("[data-testid=vertical-tab-recurring]");
    await expect(page).toHaveURL(/tabName=recurring/);

    // Click Apps tab and verify URL updates
    await page.click("[data-testid=vertical-tab-apps]");
    await expect(page).toHaveURL(/tabName=apps/);

    // Click Webhooks tab and verify URL updates
    await page.click("[data-testid=vertical-tab-webhooks]");
    await expect(page).toHaveURL(/tabName=webhooks/);

    // Click back to Basics tab and verify URL updates
    await page.click("[data-testid=vertical-tab-basics]");
    await expect(page).toHaveURL(/tabName=setup/);
  });

  test("should not trigger RSC fetch when switching tabs", async ({ page }) => {
    await gotoFirstEventType(page);
    await expect(page.getByTestId("event-title")).toBeVisible();

    // Track all RSC requests (_rsc parameter indicates RSC fetch)
    const rscRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("_rsc=") && url.includes("event-types")) {
        rscRequests.push(url);
      }
    });

    // Clear any pending requests by waiting a moment
    await page.waitForTimeout(500);
    rscRequests.length = 0;

    // Switch through multiple tabs
    await page.click("[data-testid=vertical-tab-availability]");
    await expect(page.getByTestId("vertical-tab-availability")).toHaveAttribute("aria-current", "page");

    await page.click("[data-testid=vertical-tab-event_limit_tab_title]");
    await expect(page.getByTestId("vertical-tab-event_limit_tab_title")).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
    await expect(page.getByTestId("vertical-tab-event_advanced_tab_title")).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.click("[data-testid=vertical-tab-basics]");
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");

    // Verify no RSC fetches were triggered during tab switches
    expect(rscRequests).toHaveLength(0);
  });

  test("should preserve form data when switching between tabs", async ({ page }) => {
    const eventTitle = "Tab Switch Test Event";
    await createNewUserEventType(page, { eventTitle });
    await page.waitForSelector('[data-testid="event-title"]');

    // Modify the event title on the setup tab
    const titleInput = page.getByTestId("event-title");
    await titleInput.clear();
    const modifiedTitle = "Modified Title";
    await titleInput.fill(modifiedTitle);

    // Switch to another tab
    await page.click("[data-testid=vertical-tab-availability]");
    await expect(page.getByTestId("vertical-tab-availability")).toHaveAttribute("aria-current", "page");

    // Switch to advanced tab
    await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
    await expect(page.getByTestId("vertical-tab-event_advanced_tab_title")).toHaveAttribute(
      "aria-current",
      "page"
    );

    // Switch back to setup tab
    await page.click("[data-testid=vertical-tab-basics]");
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");

    // Verify the modified title is preserved
    await expect(titleInput).toHaveValue(modifiedTitle);
  });

  test("should load availability tab data correctly via tRPC", async ({ page }) => {
    await gotoFirstEventType(page);
    await expect(page.getByTestId("event-title")).toBeVisible();

    // Set up listener for tRPC availability calls BEFORE clicking the tab
    const availabilityRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/trpc/") && (url.includes("availability") || url.includes("schedule"))) {
        availabilityRequests.push(url);
      }
    });

    // Navigate to Availability tab
    await page.click("[data-testid=vertical-tab-availability]");
    await expect(page.getByTestId("vertical-tab-availability")).toHaveAttribute("aria-current", "page");

    // Wait for tRPC calls to fire
    await page.waitForTimeout(2000);

    // Verify that tRPC calls were made for availability/schedule data
    expect(availabilityRequests.length).toBeGreaterThan(0);
  });

  test("should handle rapid tab switching without errors", async ({ page }) => {
    await gotoFirstEventType(page);
    await expect(page.getByTestId("event-title")).toBeVisible();

    // Track console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Rapidly switch between tabs
    await page.click("[data-testid=vertical-tab-availability]");
    await page.click("[data-testid=vertical-tab-event_limit_tab_title]");
    await page.click("[data-testid=vertical-tab-recurring]");
    await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
    await page.click("[data-testid=vertical-tab-apps]");
    await page.click("[data-testid=vertical-tab-webhooks]");
    await page.click("[data-testid=vertical-tab-basics]");

    // Wait for things to settle
    await page.waitForTimeout(1000);

    // Verify we ended on the basics tab correctly
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("event-title")).toBeVisible();

    // Filter out known non-critical errors (e.g., React hydration warnings)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("hydrat") && !err.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("should load correct tab when accessed directly via URL", async ({ page }) => {
    await gotoFirstEventType(page);

    // Get the current URL to extract the event type ID
    const url = page.url();
    const eventTypeIdMatch = url.match(/\/event-types\/(\d+)/);
    expect(eventTypeIdMatch).toBeTruthy();
    const eventTypeId = eventTypeIdMatch![1];

    // Navigate directly to the availability tab via URL
    await page.goto(`/event-types/${eventTypeId}?tabName=availability`);
    await expect(page.getByTestId("vertical-tab-availability")).toHaveAttribute("aria-current", "page");

    // Navigate directly to the advanced tab via URL
    await page.goto(`/event-types/${eventTypeId}?tabName=advanced`);
    await expect(page.getByTestId("vertical-tab-event_advanced_tab_title")).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.locator("[data-testid=requires-confirmation]")).toBeVisible();

    // Navigate directly to the recurring tab via URL
    await page.goto(`/event-types/${eventTypeId}?tabName=recurring`);
    await expect(page.getByTestId("vertical-tab-recurring")).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-testid=recurring-event-check]")).toBeVisible();
  });

  test("should switch from availability back to setup and show setup content", async ({ page }) => {
    await gotoFirstEventType(page);
    await expect(page.getByTestId("event-title")).toBeVisible();
    await expect(page.getByTestId("event-slug")).toBeVisible();

    // Go to availability
    await page.click("[data-testid=vertical-tab-availability]");
    await expect(page.getByTestId("vertical-tab-availability")).toHaveAttribute("aria-current", "page");

    // The setup fields should not be visible on availability tab
    await expect(page.getByTestId("event-title")).not.toBeVisible();

    // Go back to setup
    await page.click("[data-testid=vertical-tab-basics]");
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");

    // Setup fields should be visible again
    await expect(page.getByTestId("event-title")).toBeVisible();
    await expect(page.getByTestId("event-slug")).toBeVisible();
  });
});
