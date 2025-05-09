import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Select a filter from the filter dropdown
 */
export async function selectFilter(page: Page, columnId: string) {
  await page.getByTestId("add-filter-button").click();
  await page.getByTestId(`add-filter-item-${columnId}`).click();
}

/**
 * Apply a filter with a specific value
 */
export async function applyFilter(page: Page, columnId: string, value: string) {
  const existingFilter = page.getByTestId(`filter-popover-trigger-${columnId}`);
  if (!(await existingFilter.isVisible())) {
    await selectFilter(page, columnId);
  }

  await page.getByTestId(`filter-popover-trigger-${columnId}`).click();

  await page.getByPlaceholder("Search").fill(value);

  await page.getByRole("button", { name: "Apply" }).click();

  await page.waitForResponse((response) => {
    return response.url().includes("/api/trpc/viewer") && response.status() === 200;
  });
}

/**
 * Create a filter segment
 */
export async function createFilterSegment(
  page: Page,
  name: string,
  options: { teamScope?: boolean; teamName?: string } = {}
) {
  await page.getByRole("button", { name: "Save as segment" }).click();

  await page.getByLabel("Name").fill(name);

  if (options.teamScope) {
    await page.getByLabel("Save for team").click();
    if (options.teamName) {
      await page.getByPlaceholder("Select team").click();
      await page.getByText(options.teamName).click();
    }
  }

  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Filter segment saved")).toBeVisible();

  await page.waitForResponse((response) => {
    return response.url().includes("viewer.filterSegments.list") && response.status() === 200;
  });
}

/**
 * Select a segment from the dropdown
 */
export async function selectSegment(page: Page, segmentName: string) {
  await page.getByRole("button", { name: "Segment" }).click();

  await page.getByText(segmentName).click();

  await page.waitForResponse((response) => {
    return response.url().includes("/api/trpc/viewer") && response.status() === 200;
  });
}

/**
 * Delete a segment
 */
export async function deleteSegment(page: Page, segmentName: string) {
  await page.getByRole("button", { name: "Segment" }).click();

  await page.getByText(segmentName).click();

  await page.getByRole("button", { name: "Open menu" }).click();

  await page.getByText("Delete").click();

  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("Filter segment deleted")).toBeVisible();
}
