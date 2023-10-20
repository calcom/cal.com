import { expect } from "@playwright/test";

import { test } from "../../lib/fixtures";
import { PHONE } from "../utils/bookingUtils";
import {
  addAnotherLocation,
  clickEditAndLocationSelect,
  editEventType,
  getByExactText,
  loginAndGoToSetupBookingPage,
  verifyTextVisibility,
} from "./customLocationsUtils";

test.describe("Add Locations in a regular booking", () => {
  test("Add a location and change to each available location on the event type settings", async ({
    page,
    users,
  }) => {
    // Logs in a test user and navigates to the event types page.
    loginAndGoToSetupBookingPage(page, users);

    // Edit event type
    editEventType(page);

    // Select Cal Video (Global) location and check if the correct text is displayed
    await getByExactText(page, "Cal Video (Global)").click();
    verifyTextVisibility(page, "Cal Video");
    clickEditAndLocationSelect(page);

    // Select In person location and check if the correct text is displayed
    await getByExactText(page, "In Person (Attendee Address)").click();
    verifyTextVisibility(page, "In Person (Attendee Address)");
    await page.getByTestId("update-location").click();
    clickEditAndLocationSelect(page);

    // Fills the address field with a valid address and check if the address is displayed correctly
    await getByExactText(page, "In Person (Organizer Address)").click();
    await page.getByLabel("Provide an Address or Place").dblclick();
    await page.getByLabel("Provide an Address or Place").fill("test location");
    await page.getByTestId("display-location").check();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "test location");
    clickEditAndLocationSelect(page);

    // Fills the meeting link field with an invalid link and check if the invalid link alert is showing
    await getByExactText(page, "Link meeting").click();
    await page.getByLabel("Provide a Meeting Link").dblclick();
    await page.getByLabel("Provide a Meeting Link").fill("test");
    await expect(page.getByText("Invalid URL")).toBeVisible();

    // Fills the meeting link field with a valid link and check if the link is displayed correctly
    await page.getByLabel("Provide a Meeting Link").fill("https:testmeeting.com");
    await page.getByTestId("display-location").check();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "https:testmeeting.com");
    clickEditAndLocationSelect(page);

    // Select Phone location and check if the correct text is displayed
    await getByExactText(page, "Attendee Phone Number").click();
    await expect(
      page.getByText("Cal will ask your invitee to enter a phone number before scheduling.")
    ).toBeVisible();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "Attendee Phone Number");
    clickEditAndLocationSelect(page);

    // Fills the phone number field and check if the phone number is displayed correctly
    await getByExactText(page, "Organizer Phone Number").click();
    await page.getByRole("textbox").dblclick();
    await page.getByRole("textbox").clear();
    await page.getByRole("textbox").fill(PHONE);
    await page.getByTestId("display-location").check();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "+5532983289947");

    // Remove location and check if the select location is clean
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Select...")).toBeVisible();
  });

  test("Add all available locations and try to schedule a meeting", async ({ page, users }) => {
    // Logs in a test user and navigates to the event types page.
    loginAndGoToSetupBookingPage(page, users);

    // Edit event type
    editEventType(page);

    // Select Cal Video (Global) location and check if the correct text is displayed
    await getByExactText(page, "Cal Video (Global)").click();
    verifyTextVisibility(page, "Cal Video");
    addAnotherLocation(page);

    // Select In person location and check if the correct text is displayed
    await getByExactText(page, "In Person (Attendee Address)").click();
    verifyTextVisibility(page, "In Person (Attendee Address)");
    await page.getByTestId("update-location").click();
    addAnotherLocation(page);

    // Fills the address field with a valid address and check if the address is displayed correctly
    await getByExactText(page, "In Person (Organizer Address)").click();
    await page.getByLabel("Provide an Address or Place").dblclick();
    await page.getByLabel("Provide an Address or Place").fill("test location");
    await page.getByTestId("display-location").check();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "test location");
    addAnotherLocation(page);

    // Fills the meeting link field with an invalid link and check if the invalid link alert is showing
    await getByExactText(page, "Link meeting").click();
    await page.getByLabel("Provide a Meeting Link").dblclick();
    await page.getByLabel("Provide a Meeting Link").fill("test");
    await expect(page.getByText("Invalid URL")).toBeVisible();

    // Fills the meeting link field with a valid link and check if the link is displayed correctly
    await page.getByLabel("Provide a Meeting Link").fill("https:testmeeting.com");
    await page.getByTestId("display-location").check();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "https:testmeeting.com");
    addAnotherLocation(page);

    // Select Phone location and check if the correct text is displayed
    await getByExactText(page, "Attendee Phone Number").click();
    await expect(
      page.getByText("Cal will ask your invitee to enter a phone number before scheduling.")
    ).toBeVisible();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "Attendee Phone Number");
    addAnotherLocation(page);

    // Fills the phone number field and check if the phone number is displayed correctly
    await getByExactText(page, "Organizer Phone Number").click();
    await page.getByRole("textbox").dblclick();
    await page.getByRole("textbox").clear();
    await page.getByRole("textbox").fill(PHONE);
    await page.getByTestId("display-location").check();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "+5532983289947");
  });
});
