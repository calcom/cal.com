import { expect } from "@playwright/test";

import type { DaySchedule, weekSchedule } from "./fixtures/schedule";
import { test } from "./lib/fixtures";

test.describe("Availability tests", () => {
  test("Should add two schedules and make one of them the default", async ({ page, users, schedule }) => {
    // creates a user to work with
    const pro = await users.create();
    await pro.login();

    // creates the first schedule
    const workingSchedule: weekSchedule = [false, true, true, true, true, true, false];
    const firstSchedule = await schedule({
      name: "Working Hours",
      schedule: workingSchedule,
    });

    // asserts if it is prsesent within the schedules list
    const schedulesLocator = await page.locator("[data-testid=schedules]");
    await expect(schedulesLocator.locator("text=Working Hours")).toBeVisible();

    // asserts it is not the default
    await expect(schedulesLocator.locator('[title="Working Hours"] >> text=default')).not.toBeVisible();

    // creates a second schedule
    const weekendsSchedule: weekSchedule = [true, false, false, false, false, true, true];
    const secondtSchedule = await schedule({
      name: "Weekends",
      schedule: weekendsSchedule,
    });

    // assert if it is within the schedules list
    await expect(schedulesLocator.locator("text=Weekends")).toBeVisible();

    // assert there are only two schedules
    await expect(await schedulesLocator.locator("li").count()).toBe(2);

    // asserts none is set to be a default yet
    await expect(await schedulesLocator.locator("text=default").count()).toBe(0);

    // make fistSchedule the default
    await firstSchedule.default();

    // asserts fisrtSchedule is the default
    await expect(await schedulesLocator.locator("text=default").count()).toBe(1);
    await expect(schedulesLocator.locator(`[title="Working Hours"] >> text=default`)).toBeVisible();
  });

  test("Should add a default schedule from onboarding and reassign the default to a new one", async ({
    page,
    users,
    schedule,
  }) => {
    // raise the timeout for this test in 10 seconds because onboarding is a slow process
    test.setTimeout(70000);

    // onboards a user with all the defaults from the onboarding flow
    const pro = await users.create({ completedOnboarding: false });
    await pro.login();
    await pro.onboard();

    const defaultScheduleName = "Working Hours";
    await page.goto("/availability");

    // assert if the defult schedule is within the schedules list
    const schedulesLocator = await page.locator("[data-testid=schedules]");
    await expect(schedulesLocator.locator(`text=${defaultScheduleName}`)).toBeVisible();

    // asserts if it is the default
    await expect(schedulesLocator.locator(`[title="${defaultScheduleName}"] >> text=default`)).toBeVisible();

    // creates a second schedule
    const weekendsSchedule: weekSchedule = [true, false, false, false, false, true, true];
    const secondtSchedule = await schedule({
      name: "Weekends",
      schedule: weekendsSchedule,
    });

    // assert if it is within the list of schedules
    await expect(schedulesLocator.locator("text=Weekends")).toBeVisible();

    // assert there are only two schedules
    await expect(await schedulesLocator.locator("li").count()).toBe(2);

    // asserts default still belongs to the schedule created with onboarding
    await expect(schedulesLocator.locator('[title="Working Hours"] >> text=default')).toBeVisible();
    await expect(await schedulesLocator.locator("text=default").count()).toBe(1);

    // Reassign the default schedule to the second one
    await secondtSchedule.default();

    // asserts secondSchedule is the new default schedule
    await expect(await schedulesLocator.locator("text=default").count()).toBe(1);
    await expect(schedulesLocator.locator(`[title="Weekends"] >> text=default`)).toBeVisible();
  });

  test("Should set a custom timezone for the created schedule", async ({ page, users, schedule }) => {
    const pro = await users.create();
    await pro.login();

    // creates a schedule and assign a custom timezone
    const workingSchedule: weekSchedule = [false, true, true, true, true, true, false];
    const firstSchedule = await schedule({
      name: "Working Hours",
      schedule: workingSchedule,
      timezone: "Pacific Time",
    });

    // assert the schedule was created
    const schedulesLocator = await page.locator("[data-testid=schedules]");
    await expect(schedulesLocator.locator(`[title="Working Hours"]`)).toBeVisible();
  });

  test("Should add a schedule with a mixture of default, single and multiple time slots for each weekday", async ({
    page,
    users,
    schedule,
  }) => {
    const pro = await users.create();
    await pro.login();

    // Set Saturdays and Sundays as non-available
    const Sat = false;
    const Sun = false;

    // Set Mondays availability to use the system default working hours
    const Mon = true;

    // Set Tuesday and Wednesday availability to a single and custom time slots for each day
    const Tue = [["10:00am", "4:00pm"]] as [DaySchedule];
    const Wed = [["2:30pm", "6:00pm"]] as [DaySchedule];

    // Set Thursday and Friday availability to multiple time slots for each day
    const Thu = [
      ["9:00am", "11:00am"],
      ["1:00pm", "6:00pm"],
    ] as [DaySchedule, ...DaySchedule[]];
    const Fri = [
      ["9:30am", "1:30pm"],
      ["3:00pm", "7:45pm"],
    ] as [DaySchedule, ...DaySchedule[]];

    // Build the working schedule based on what was defined for each day
    const workingSchedule: weekSchedule = [Sun, Mon, Tue, Wed, Thu, Fri, Sat];

    const firstSchedule = await schedule({
      name: "Working Hours",
      schedule: workingSchedule,
    });

    // assert the schedule was created
    const schedulesLocator = await page.locator("[data-testid=schedules]");
    await expect(schedulesLocator.locator(`[title="Working Hours"]`)).toBeVisible();
  });
});
