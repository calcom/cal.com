import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { submitAndWaitForResponse } from "playwright/lib/testUtils";

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

export async function addOrOpenFilter(page: Page, columnId: string) {
  const existingFilter = page.getByTestId(`filter-popover-trigger-${columnId}`);
  if (await existingFilter.isVisible()) {
    await openFilter(page, columnId);
  } else {
    await addFilter(page, columnId);
  }
}

/**
 * Apply a filter with a specific value
 */
export async function applySelectFilter(page: Page, columnId: string, value: string) {
  await addOrOpenFilter(page, columnId);
  await selectOptionValue(page, columnId, value);
  await page.keyboard.press("Escape");
}

export async function selectOptionValue(page: Page, columnId: string, value: string) {
  await page.getByTestId(`select-filter-options-${columnId}`).getByRole("option", { name: value }).waitFor();
  await page.getByTestId(`select-filter-options-${columnId}`).getByRole("option", { name: value }).click();
}

export async function applyTextFilter(page: Page, columnId: string, operator: string, operand?: string) {
  await addOrOpenFilter(page, columnId);

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
  await addOrOpenFilter(page, columnId);

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

  await submitAndWaitForResponse(page, "/api/trpc/filterSegments/delete?batch=1", {
    action: () =>
      page
        .locator('[role="dialog"]')
        .filter({ hasText: "Delete Segment" })
        .getByRole("button", { name: "Delete" })
        .click(),
  });

  await page.keyboard.press("Escape");
  await expect(page.getByText("Filter segment deleted")).toBeVisible();
}

/**
 * List all available segments
 */
export async function listSegments(page: Page): Promise<string[]> {
  await page.getByTestId("filter-segment-select").nth(0).click();

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

/**
 * Check if a system segment is visible in the dropdown
 */
export async function expectSystemSegmentVisible(page: Page, segmentName: string) {
  await page.getByTestId("filter-segment-select").click();
  await expect(
    page.locator('[data-testid="filter-segment-select-content"]').getByText("Default")
  ).toBeVisible();
  await expect(
    page
      .locator('[data-testid="filter-segment-select-content"] [role="menuitem"]')
      .filter({ hasText: segmentName })
  ).toBeVisible();
  await page.keyboard.press("Escape");
}

/**
 * Check that no segment is currently selected
 */
export async function expectSegmentCleared(page: Page) {
  // Check that no segment is selected (button shows default text)
  const segmentSelect = page.getByTestId("filter-segment-select");
  const buttonText = await segmentSelect.textContent();
  expect(["Saved filters", "Saved"]).toContain(buttonText?.trim());
}

/**
 * Check that a specific segment is currently selected
 */
export async function expectSegmentSelected(page: Page, segmentName: string) {
  await expect(locateSelectedSegmentName(page, segmentName)).toBeVisible();
}

/**
 * Duplicate an existing segment
 */
export async function duplicateSegment(page: Page, originalName: string, newName: string) {
  await openSegmentSubmenu(page, originalName);
  await page.getByTestId("filter-segment-select-submenu-content").getByText("Duplicate").click();
  await page.getByTestId("duplicate-segment-name").fill(newName);
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByText("Filter segment duplicated")).toBeVisible();
  await page.keyboard.press("Escape");
}

/**
 * Rename an existing segment
 */
export async function renameSegment(page: Page, originalName: string, newName: string) {
  await openSegmentSubmenu(page, originalName);
  await page.getByTestId("filter-segment-select-submenu-content").getByText("Rename").click();
  await page.getByTestId("rename-segment-name").fill(newName);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Filter segment updated")).toBeVisible();
  await page.keyboard.press("Escape");
}

/**
 * Check if a segment group (like "Default" or "Personal") is visible
 */
export async function expectSegmentGroupVisible(page: Page, groupName: string) {
  await page.getByTestId("filter-segment-select").click();
  await expect(
    page.locator('[data-testid="filter-segment-select-content"]').getByText(groupName)
  ).toBeVisible();
  await page.keyboard.press("Escape");
}
