import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Helper function to get text within a specific table column
export const getByTableColumnText = (page: Page, columnId: string, text: string) =>
  page.locator(`[data-testid="data-table-td-${columnId}"]`).getByText(text);

/**
 * Add a filter from the filter dropdown
 */
export async function addFilter(page: Page, columnId: string) {
  await page.getByTestId("add-filter-button").click();
  await page.getByTestId(`add-filter-item-${columnId}`).click();
}

export async function openFilter(page: Page, columnId: string) {
  await page.getByTestId(`filter-popover-trigger-${columnId}`).click();
}

/**
 * Apply a filter with a specific value
 */
export async function applySelectFilter(page: Page, columnId: string, value: string) {
  const existingFilter = page.getByTestId(`filter-popover-trigger-${columnId}`);
  if (!(await existingFilter.isVisible())) {
    await addFilter(page, columnId);
  }
  await openFilter(page, columnId);
  await selectOptionValue(page, columnId, value);
  await page.keyboard.press("Escape");
}

export async function selectOptionValue(page: Page, columnId: string, value: string) {
  await page.getByTestId(`select-filter-options-${columnId}`).getByRole("option", { name: value }).click();
}

export async function applyTextFilter(page: Page, columnId: string, operator: string, operand?: string) {
  const existingFilter = page.getByTestId(`filter-popover-trigger-${columnId}`);
  if (!(await existingFilter.isVisible())) {
    await addFilter(page, columnId);
  }
  await openFilter(page, columnId);

  await page.getByTestId(`text-filter-options-select-${columnId}`).click();
  await page
    .locator(`[data-testid="text-filter-options-${columnId}"] [id^="react-select-"]`)
    .getByText(operator)
    .first()
    .click();
  if (operand) {
    await page.keyboard.press("Tab");
    await page.keyboard.type(operand);
  }
  await page.keyboard.press("Enter");

  await page.keyboard.press("Escape");
}

export async function applyNumberFilter(page: Page, columnId: string, operator: string, operand: number) {
  const existingFilter = page.getByTestId(`filter-popover-trigger-${columnId}`);
  if (!(await existingFilter.isVisible())) {
    await addFilter(page, columnId);
  }
  await openFilter(page, columnId);

  await page.getByTestId(`number-filter-options-select-${columnId}`).click();
  await page
    .locator(`[data-testid="number-filter-options-${columnId}"] [id^="react-select-"]`)
    .getByText(operator)
    .first()
    .click();
  await page.keyboard.press("Tab");
  await page.keyboard.type(String(operand));
  await page.keyboard.press("Enter");

  await page.keyboard.press("Escape");
}

/**
 * Clear all filters
 */
export async function clearFilters(page: Page) {
  await page.getByTestId("clear-filters-button").click();
}

/**
 * Create a filter segment
 */
export async function createFilterSegment(
  page: Page,
  name: string,
  options: { teamScope?: boolean; teamName?: string } = {}
) {
  await page.getByTestId("save-filter-segment-button").click();

  await page.getByTestId("save-filter-segment-name").fill(name);

  if (options.teamScope) {
    await page.getByLabel("Save for team").click();
    if (options.teamName) {
      await page.getByTestId("save-filter-segment-team-select").click();
      await page
        .locator('[data-testid="save-filter-segment-dialog"] [id^="react-select-"]')
        .getByText(options.teamName)
        .click();
    }
  }

  await page.getByTestId("save-filter-segment-dialog").getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Filter segment saved")).toBeVisible();
}

/**
 * Select a segment from the dropdown
 */
export async function selectSegment(page: Page, segmentName: string) {
  await page.getByTestId("filter-segment-select").click();

  await page
    .locator('[data-testid="filter-segment-select-content"] [role="menuitem"]')
    .filter({ hasText: segmentName })
    .click();
}

/**
 * Open submenu of a certain segment
 */
export async function openSegmentSubmenu(page: Page, segmentName: string) {
  await page.getByTestId("filter-segment-select").click();

  await page
    .locator('[data-testid="filter-segment-select-content"] [role="menuitem"]')
    .filter({ hasText: segmentName })
    .locator('[data-testid="filter-segment-select-submenu-button"]')
    .click();
}

/**
 * Delete a segment
 */
export async function deleteSegment(page: Page, segmentName: string) {
  openSegmentSubmenu(page, segmentName);

  await page.getByTestId("filter-segment-select-submenu-content").getByText("Delete").click();

  await page
    .locator('[role="dialog"]')
    .filter({ hasText: "Delete Segment" })
    .getByRole("button", { name: "Delete" })
    .click();

  await page.keyboard.press("Escape");
  await expect(page.getByText("Filter segment deleted")).toBeVisible();
}

/**
 * List all available segments
 */
export async function listSegments(page: Page): Promise<string[]> {
  await page.getByTestId("filter-segment-select").click();

  const menuItems = page.locator('[data-testid="filter-segment-select-content"] [role="menuitem"]');
  const count = await menuItems.count();

  const segments: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await menuItems.nth(i).innerText();
    segments.push(text);
  }

  await page.keyboard.press("Escape");
  return segments;
}

export function locateSelectedSegmentName(page: Page, expectedName: string) {
  return page.locator('[data-testid="filter-segment-select"]').filter({ hasText: expectedName });
}
