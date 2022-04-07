import type { Page } from "@playwright/test";

export type weekSchedule = Partial<Record<Day, [DaySchedule, ...DaySchedule[]] | boolean>>;
export type DaySchedule = [startTime: TimeSchedule, endTime: TimeSchedule];

type Day = "0" | "1" | "2" | "3" | "4" | "5" | "6";
// adds type-safety when filling time slots and saves on adding a runtime checker within the tests
type TimeSchedule = `${TimeScheduleHour}:${TimeScheduleMinute}${"am" | "pm"}`;
type TimeScheduleMinute = "00" | "15" | "30" | "45";
type TimeScheduleHour<A extends number[] = []> = A["length"] extends 12
  ? A[number]
  : TimeScheduleHour<[...A, A["length"]]>;

export interface Schedule {
  name: string;
  schedule?: weekSchedule;
  timezone?: string;
}

export const createScheduleFixture = async (schedule: Schedule, page: Page) => {
  const id = (await createSchedule(schedule, page))!;

  return {
    delete: async () => await deleteSchedule(id, page),
    default: async () => await makeDefault(id, page),
  };
};

async function createSchedule(schedule: Schedule, page: Page) {
  // with default options
  const defaultSchedule = [false, true, true, true, true, false];
  const _schedule = {
    ...{ schedule: defaultSchedule, timezone: "London" },
    ...schedule,
  };

  // open the create new schedule modal
  await page.goto("./availability?dialog=new-schedule");

  // get locators
  const addScheduleFormLocator = await page.locator("[data-testid=add-schedule-form]");
  const scheduleNameLocator = await addScheduleFormLocator.locator("[name=name]");
  const addScheduleSubmitLocator = await addScheduleFormLocator.locator("[type=submit]");

  // create new schedule
  await scheduleNameLocator.fill(schedule.name);
  await addScheduleSubmitLocator.click();
  await page.waitForTimeout(2000);

  // Extract the newly created schedule id
  const url = new URL(await page.url());
  const scheduleId = parseInt(url.pathname.split("/").pop() as string);

  // set timezone if it was provided
  const timeZoneLocator = await page.locator("[data-testid=add-timezone-schedule]");
  await timeZoneLocator.click();
  await timeZoneLocator.locator(`text=${_schedule.timezone}`).last().click();

  // traverse through each day and generate a new schedule for each
  for await (let weekDayNumber of Object.keys(_schedule.schedule)) {
    const daySchedule = _schedule.schedule[weekDayNumber as unknown as Day]!;
    // skip day if is set to false
    if (!daySchedule) continue;

    // check day checkbox
    const dayLocator = await page.locator(`[data-testid=availability-day-${weekDayNumber}]`);
    await dayLocator.locator("[type=checkbox]").check();

    // traverse each time slot for the day and generate availbility time slots as provided
    if (typeof daySchedule != "boolean") {
      let i = 0;
      for await (let slot of daySchedule) {
        // press the plus button before adding a new time slot
        if (i) {
          const addSlotBtn = await dayLocator.locator("[data-testid=add-slot-schedule-btn]");
          await addSlotBtn.click();
        }

        // prepare and set the schedule for each time slot
        const timeSelector = `[data-testid="schedule\.${weekDayNumber}\.${i}"] > div`;
        const startTimeLocator = await dayLocator.locator(timeSelector).first();
        await startTimeLocator.click();
        await startTimeLocator.locator(`text="${slot[0]}"`).last().click();
        const endTimeLocator = await dayLocator.locator(timeSelector).last();
        await endTimeLocator.click();
        await endTimeLocator.locator(`text="${slot[1]}"`).last().click();
        i++;
      }
    }
  }
  // save changes
  await page.locator("[data-testid=save-schedule-btn]").click();
  await page.waitForTimeout(2000);

  // return the schedule id for the delete and default methods
  return scheduleId;
}

async function deleteSchedule(scheduleId: number, page: Page) {
  await page.goto("./availability");
  const schedules = await page.locator("[data-testid=schedules]");
  const schedule = await schedules.locator(`[data-testid=schedule-${scheduleId}]`);
  await schedule.locator("[data-testid=dropdown-trigger]").click();
  await page.locator("[data-testid=delete-schedule-btn]").click();
  await page.waitForTimeout(2000);
}

async function makeDefault(scheduleId: number, page: Page) {
  await page.goto(`/availability/${scheduleId}`);

  // if timeout wins the race it means schedule is already the default one
  await Promise.race([
    page.waitForTimeout(2000),
    page.locator("[data-testid=set-default-schedule-switch]").click(),
  ]);

  // save changes
  await page.locator("[data-testid=save-schedule-btn]").click();
  await page.waitForTimeout(2000);
}
