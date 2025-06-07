import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth, bookTimeSlot } from "./lib/testUtils";
import { submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Team Availability", () => {
  test.beforeEach(async ({ users }) => {
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
        teammates: teamMatesObj,
      }
    );

    await owner.apiLogin();
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("success booking with multiple hosts", async ({ page, users }) => {
    await page.goto("/event-types");
    await expect(page).toHaveURL(/.*\/event-types/);

    // creating new team round robin event
    await page.getByTestId("new-event-type").click();
    await page.getByTestId("option-team-1").click();
    await page.getByTestId("event-type-quick-chat").fill("test-rr-event");
    await page.getByLabel("Round RobinCycle meetings").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId("round-robin-multiple-hosts-toggle").click();

    // setting multiple hosts count
    await page.getByTestId("round-robin-multiple-hosts-count-input").fill("3");

    // assigning all team members
    await page.getByTestId("assign-all-team-members-toggle").click();

    // updating event type
    await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    const page2Promise = page.waitForEvent("popup");

    // booking event
    await page.getByTestId("preview-button").click();
    const page2 = await page2Promise;

    await selectFirstAvailableTimeSlotNextMonth(page2);
    await bookTimeSlot(page2);

    // booking success as multiple hosts count(3) is less than available hosts(4)
    await expect(page2.getByTestId("success-page")).toBeVisible();
  });

  test("show alert if multiple hosts count is more than available hosts", async ({ page, users }) => {
    await page.goto("/event-types");
    await expect(page).toHaveURL(/.*\/event-types/);

    // creating new team round robin event
    await page.getByTestId("new-event-type").click();
    await page.getByTestId("option-team-1").click();
    await page.getByTestId("event-type-quick-chat").fill("test-rr-event");
    await page.getByLabel("Round RobinCycle meetings").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId("round-robin-multiple-hosts-toggle").click();

    // setting multiple hosts count
    await page.getByTestId("round-robin-multiple-hosts-count-input").fill("10");

    // assigning all team members
    await page.getByTestId("assign-all-team-members-toggle").click();

    // updating event type
    await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    const page2Promise = page.waitForEvent("popup");

    // booking event
    await page.getByTestId("preview-button").click();
    const page2 = await page2Promise;
    await selectFirstAvailableTimeSlotNextMonth(page2);

    // showing error alert as multiple hosts count(10) is more than available hosts(4)
    await bookTimeSlot(page2, { expectedStatusCode: 500 });
    await expect(page2.getByTestId("alert")).toBeVisible();
    await expect(page2.getByTestId("alert")).toContainText("Could not book the meeting.");
  });
});
