import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Feature Opt-In Banner", () => {
  test("shows banner on bookings page and allows user to opt-in to bookings-v3 feature", async ({
    page,
    users,
    features,
  }) => {
    // Enable the bookings-v3 feature flag globally in the database
    // This is required for the banner to show (globalEnabled must be true)
    await features.set("bookings-v3", true);

    // Create a user WITHOUT the bookings-v3 feature flag enabled
    // By passing an empty array, we override the default user feature flags
    const user = await users.create({
      userFeatureFlags: [],
    });

    await user.apiLogin();

    // Navigate to the bookings page
    await page.goto("/bookings/upcoming");

    // Wait for the page to load and the banner to appear
    // The banner should appear in the bottom right corner
    const banner = page.locator(".fixed.bottom-5.right-5");
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Verify the banner contains the expected title
    await expect(banner.locator("h3")).toBeVisible();

    // Click the "Try it" button to open the confirmation dialog
    const tryItButton = banner.getByRole("button", { name: /try it/i });
    await expect(tryItButton).toBeVisible();
    await tryItButton.click();

    // Verify the confirmation dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The dialog should have the feature name in the title
    // and an "Enable" button to confirm
    const enableButton = dialog.getByRole("button", { name: /enable/i });
    await expect(enableButton).toBeVisible();

    // Click the "Enable" button to opt-in
    await enableButton.click();

    // Verify the success dialog appears
    // The success dialog has "Feature enabled successfully" title
    await expect(dialog.getByText(/feature enabled successfully/i)).toBeVisible();

    // Click "View Settings" button to navigate to the settings page
    const viewSettingsButton = dialog.getByRole("button", { name: /view settings/i });
    await expect(viewSettingsButton).toBeVisible();
    await viewSettingsButton.click();

    // Verify we are redirected to the features settings page
    await expect(page).toHaveURL(/\/settings\/my-account\/features/);

    // Verify the bookings-v3 feature is shown in the list and is enabled
    // The feature should have the "enabled" toggle selected
    const featureItem = page.locator("text=bookings_v3_name").first();
    await expect(featureItem).toBeVisible();

    // Check that the "enabled" option is selected in the toggle group
    const toggleGroup = featureItem.locator("..").locator("..").getByRole("group");
    const enabledToggle = toggleGroup.getByRole("radio", { name: /enabled/i });
    await expect(enabledToggle).toHaveAttribute("data-state", "on");
  });
});
