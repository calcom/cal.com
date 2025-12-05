import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("DateRangeFilter Playground", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create({
      role: "ADMIN",
    });
    await user.apiLogin();
    await page.goto("/settings/admin/playground/date-range-filter");
    await page.waitForLoadState("networkidle");
  });

  test("should render the playground page with all scenarios", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "DateRangeFilter Playground" })).toBeVisible();

    await expect(page.getByTestId("drf-scenario-past")).toBeVisible();
    await expect(page.getByTestId("drf-scenario-future")).toBeVisible();
    await expect(page.getByTestId("drf-scenario-any")).toBeVisible();
    await expect(page.getByTestId("drf-scenario-customOnly")).toBeVisible();
  });

  test('range="past" should show presets and restrict to past dates', async ({ page }) => {
    const scenario = page.getByTestId("drf-scenario-past");
    await expect(scenario).toBeVisible();

    const filterTrigger = scenario.getByTestId("filter-popover-trigger-dateRange");
    await filterTrigger.click();

    await expect(page.getByTestId("date-range-options-tdy")).toBeVisible();
    await expect(page.getByTestId("date-range-options-w")).toBeVisible();
    await expect(page.getByTestId("date-range-options-t")).toBeVisible();
    await expect(page.getByTestId("date-range-options-m")).toBeVisible();
    await expect(page.getByTestId("date-range-options-y")).toBeVisible();
    await expect(page.getByTestId("date-range-options-c")).toBeVisible();
  });

  test('range="future" should show only compatible presets (Today, Custom)', async ({ page }) => {
    const scenario = page.getByTestId("drf-scenario-future");
    await expect(scenario).toBeVisible();

    const filterTrigger = scenario.getByTestId("filter-popover-trigger-dateRange");
    await filterTrigger.click();

    await expect(page.getByTestId("date-range-options-tdy")).toBeVisible();
    await expect(page.getByTestId("date-range-options-c")).toBeVisible();

    await expect(page.getByTestId("date-range-options-w")).not.toBeVisible();
    await expect(page.getByTestId("date-range-options-t")).not.toBeVisible();
    await expect(page.getByTestId("date-range-options-m")).not.toBeVisible();
    await expect(page.getByTestId("date-range-options-y")).not.toBeVisible();
  });

  test('range="any" should show all presets', async ({ page }) => {
    const scenario = page.getByTestId("drf-scenario-any");
    await expect(scenario).toBeVisible();

    const filterTrigger = scenario.getByTestId("filter-popover-trigger-dateRange");
    await filterTrigger.click();

    await expect(page.getByTestId("date-range-options-tdy")).toBeVisible();
    await expect(page.getByTestId("date-range-options-w")).toBeVisible();
    await expect(page.getByTestId("date-range-options-t")).toBeVisible();
    await expect(page.getByTestId("date-range-options-m")).toBeVisible();
    await expect(page.getByTestId("date-range-options-y")).toBeVisible();
    await expect(page.getByTestId("date-range-options-c")).toBeVisible();
  });

  test('range="customOnly" should hide presets and show only calendar', async ({ page }) => {
    const scenario = page.getByTestId("drf-scenario-customOnly");
    await expect(scenario).toBeVisible();

    const filterTrigger = scenario.getByTestId("filter-popover-trigger-dateRange");
    await filterTrigger.click();

    await expect(page.getByTestId("date-range-options-tdy")).not.toBeVisible();
    await expect(page.getByTestId("date-range-options-w")).not.toBeVisible();
    await expect(page.getByTestId("date-range-options-c")).not.toBeVisible();

    await expect(page.getByTestId("date-range-calendar")).toBeVisible();
  });

  test("custom preset should show calendar picker", async ({ page }) => {
    const scenario = page.getByTestId("drf-scenario-past");
    await expect(scenario).toBeVisible();

    const filterTrigger = scenario.getByTestId("filter-popover-trigger-dateRange");
    await filterTrigger.click();

    await page.getByTestId("date-range-options-c").click();

    await expect(page.getByTestId("date-range-calendar")).toBeVisible();
  });
});
