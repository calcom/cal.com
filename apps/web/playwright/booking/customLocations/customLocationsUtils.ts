import { expect, type Page } from "@playwright/test";
import type { Fixtures } from "playwright/lib/fixtures";

import { loginUser } from "../utils/bookingUtils";

export const editEventType = async (page: Page) => {
  // Edit title
  await page.getByLabel("Title").click();
  await page.getByLabel("Title").fill("30 min test");

  // Edit description
  await page.locator("#event-type-form").getByRole("paragraph").click();
  await page.locator("#event-type-form").getByRole("paragraph").fill("test");

  // Click on markdown buttons
  await page.locator("#event-type-form").getByRole("button").first().click();
  await page.locator("#event-type-form").getByRole("button").nth(1).click();
  await page.locator("#event-type-form").getByRole("button").nth(2).click();

  // Edit url
  await page.getByLabel("URL").click();
  await page.getByLabel("URL").fill("30-min test");
  await page.locator("#location-select").click();
};

export const loginAndGoToSetupBookingPage = async (page: Page, users: Fixtures["users"]) => {
  loginUser(page, users);
  await page.getByRole("link", { name: "30 min" }).click();

  // Go to event type
  await page.getByTestId("vertical-tab-event_setup_tab_title").click();
};

export const verifyTextVisibility = async (page: Page, text: string) => {
  await expect(page.locator("div").filter({ hasText: text }).first()).toBeVisible();
};

// Helper function to get text with exact match
export const getByExactText = (page: Page, text: string) => {
  return page.getByText(text, { exact: true });
};

// Helper function to click Edit and then the location selector
export const clickEditAndLocationSelect = async (page: Page) => {
  await page.getByRole("button", { name: "Edit" }).click();
  await page.locator("#location-select").click();
};

export const addAnotherLocation = async (page: Page) => {
  await page.getByTestId("add-location").click();
  await page.locator("#location-select").click();
};
