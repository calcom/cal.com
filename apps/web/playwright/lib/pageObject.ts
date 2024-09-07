import type { Page } from "@playwright/test";

export const selectInteractions = {
  async chooseOption({
    page,
    selector,
    optionText,
  }: {
    page: Page;
    selector: string;
    optionText: string;
  }): Promise<void> {
    // Open dropdown
    await page.locator(selector).click();
    const selectParentWithOptions = page.locator(`:has(> ${selector})`);
    // Select option
    await selectParentWithOptions.getByText(optionText, { exact: true }).click();
  },
};
