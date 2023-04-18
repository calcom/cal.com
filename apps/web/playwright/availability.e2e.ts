import { expect } from "@playwright/test";

import dayjs from "@calcom/dayjs";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Availablity tests", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.login();
    await page.goto("/availability");
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="schedules"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Date Overrides", async ({ page }) => {
    await test.step("Can add a date override", async () => {
      await page.locator('[data-testid="schedules"] > li a').click();
      await page.locator('[data-testid="add-override"]').click();
      await page.locator('[id="modal-title"]').waitFor();
      await page.locator('[data-testid="incrementMonth"]').click();
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();
      await page.locator('[data-testid="date-override-mark-unavailable"]').click();
      await page.locator('[data-testid="add-override-submit-btn"]').click();
      await expect(page.locator('[data-testid="date-overrides-list"] > li')).toHaveCount(1);
      await page.locator('[form="availability-form"][type="submit"]').click();
    });

    // The troubleshooter is unaware of the selected schedule, kept the override logic for now but needs rework.
    // await test.step("Date override is displayed in troubleshooter", async () => {
    //   const response = await page.waitForResponse("**/api/trpc/viewer.availability.schedule.update?batch=1");
    //   const json = await response.json();
    //   // @ts-expect-error trust me bro
    //   const date = json[0].result.data.json.schedule.availability.find((a) => !!a.date);
    //   const troubleshooterURL = `/availability/troubleshoot?date=${dayjs(date.date).format("YYYY-MM-DD")}`;
    //   await page.goto(troubleshooterURL);
    //   await expect(page.locator('[data-testid="troubleshooter-busy-time"]')).toHaveCount(1);
    // });
  });

  test("Availablity pages", async ({ page }) => {
    await test.step("Can add a new schedule", async () => {
      await page.locator('[data-testid="new-schedule"]').click();
      await page.locator('[id="name"]').fill("More working hours");
      page.locator('[type="submit"]').click();
      await expect(page.locator("[data-testid=availablity-title]")).toHaveValue("More working hours");
    });
  });
});
