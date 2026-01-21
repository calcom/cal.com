import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Feature Opt-In Banner", () => {
  test("shows banner on bookings page and allows user to opt-in to bookings-v3 feature", async ({
    page,
    users,
    prisma,
  }) => {
    // Enable the bookings-v3 feature flag globally in the database
    // This is required for the banner to show (globalEnabled must be true)
    // Use upsert to ensure the feature exists and is enabled
    await prisma.feature.upsert({
      where: { slug: "bookings-v3" },
      update: { enabled: true },
      create: { slug: "bookings-v3", enabled: true, type: "OPERATIONAL" },
    });

    // Create a user WITHOUT the bookings-v3 feature flag enabled
    // By passing an empty array, we override the default user feature flags
    const user = await users.create({
      userFeatureFlags: [],
    });

    await user.apiLogin();

    // Navigate to the bookings page
    await page.goto("/bookings/upcoming");

    // Wait for the page to load and the banner to appear
    // The banner title is "Try the new bookings page"
    const bannerTitle = page.getByText("Try the new bookings page");
    await expect(bannerTitle).toBeVisible({ timeout: 15000 });

    // Click the "Try it" button to open the confirmation dialog
    const tryItButton = page.getByRole("button", { name: "Try it" });
    await expect(tryItButton).toBeVisible();
    await tryItButton.click();

    // Verify the confirmation dialog appears with the feature name "Enhanced bookings"
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Enhanced bookings")).toBeVisible();

    // Click the "Enable" button to opt-in
    const enableButton = dialog.getByRole("button", { name: "Enable" });
    await expect(enableButton).toBeVisible();
    await enableButton.click();

    // Verify the success dialog appears with "Feature enabled successfully!" title
    await expect(dialog.getByText("Feature enabled successfully!")).toBeVisible();

    // Click "View Settings" button to navigate to the settings page
    const viewSettingsButton = dialog.getByRole("button", { name: "View Settings" });
    await expect(viewSettingsButton).toBeVisible();
    await viewSettingsButton.click();

    // Verify we are redirected to the features settings page
    await expect(page).toHaveURL(/\/settings\/my-account\/features/);

    // Verify the bookings-v3 feature "Enhanced bookings" is shown in the list
    const featureItem = page.getByText("Enhanced bookings");
    await expect(featureItem).toBeVisible();
  });
});
