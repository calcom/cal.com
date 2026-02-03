import { getOptInFeatureConfig, shouldDisplayFeatureAt } from "@calcom/features/feature-opt-in/config";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Feature Opt-In Banner", () => {
  test("shows banner on bookings page and allows user to opt-in to bookings-v3 feature", async ({
    page,
    users,
    prisma,
  }) => {
    const featureConfig = getOptInFeatureConfig("bookings-v3");
    if (!featureConfig || !shouldDisplayFeatureAt(featureConfig, "banner")) {
      return;
    }

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

    // Wait for the banner to appear
    const banner = page.getByTestId("feature-opt-in-banner");
    await expect(banner).toBeVisible({ timeout: 15000 });

    // Click the "Try it" button to open the confirmation dialog
    const tryItButton = page.getByTestId("feature-opt-in-banner-try-it");
    await tryItButton.click();

    // Verify the confirmation dialog appears
    const confirmDialog = page.getByTestId("feature-opt-in-confirm-dialog");
    await expect(confirmDialog).toBeVisible();

    // Click the "Enable" button to opt-in
    const enableButton = page.getByTestId("feature-opt-in-confirm-dialog-enable");
    await enableButton.click();

    // Verify the success dialog appears
    const successDialogTitle = page.getByTestId("feature-opt-in-success-dialog-title");
    await expect(successDialogTitle).toBeVisible();

    // Click "View Settings" button to navigate to the settings page
    const viewSettingsButton = page.getByTestId("feature-opt-in-success-dialog-view-settings");
    await viewSettingsButton.click();

    // Verify we are redirected to the features settings page
    await expect(page).toHaveURL(/\/settings\/my-account\/features/);
  });
});
