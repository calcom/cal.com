import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";

import { addFilter } from "./filter-helpers";
import { test } from "./lib/fixtures";
import { submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Out of office", () => {
  test("User can create out of office entry", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await goToOOOPage(page);
    await openOOODialog(page);

    await page.getByTestId("reason_select").click();

    await page.getByTestId("select-option-4").click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Demo notes");

    // send request
    await saveAndWaitForResponse(page);

    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();
  });

  test("Profile redirection", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    const userTo = await users.create({ name: "userTwo" });
    const uuid = uuidv4();
    await prisma.outOfOfficeEntry.create({
      data: {
        start: dayjs().startOf("day").toDate(),
        end: dayjs().startOf("day").add(1, "w").toDate(),
        uuid,
        user: { connect: { id: user.id } },
        toUser: { connect: { id: userTo.id } },
        createdAt: new Date(),
        reason: {
          connect: {
            id: 1,
          },
        },
      },
    });

    await page.goto(`/${user.username}`);

    const eventTypeLink = page.locator('[data-testid="event-type-link"]').first();
    await eventTypeLink.click();

    await expect(page.getByTestId("away-emoji").first()).toBeVisible();
  });

  test("User can create Entry for past", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await goToOOOPage(page);
    await openOOODialog(page);

    await selectToAndFromDates(page, "13", "22", "previous");

    // send request
    await saveAndWaitForResponse(page);

    const ooo = await prisma.outOfOfficeEntry.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        start: true,
        end: true,
      },
      take: 1,
    });

    const latestEntry = ooo[0];

    const currentDate = dayjs();
    const fromDate = dayjs(latestEntry.start);
    const toDate = dayjs(latestEntry.end);

    expect(toDate.isBefore(currentDate)).toBe(true);
    expect(fromDate.isBefore(currentDate)).toBe(true);
  });

  test("User can create overriding entries", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await goToOOOPage(page);
    await openOOODialog(page);

    await selectToAndFromDates(page, "13", "22");

    // send request
    await saveAndWaitForResponse(page);
    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();

    // add another entry
    await openOOODialog(page);

    await selectToAndFromDates(page, "11", "24");

    // send request
    await saveAndWaitForResponse(page);

    await expect(page.locator(`data-testid=table-redirect-n-a`)).toHaveCount(2);
  });

  test("User cannot create duplicate entries", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await goToOOOPage(page);
    await openOOODialog(page);

    await selectToAndFromDates(page, "13", "22");

    // send request
    await saveAndWaitForResponse(page);
    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();

    // add another entry
    await openOOODialog(page);

    await selectToAndFromDates(page, "13", "22");

    // send request
    await saveAndWaitForResponse(page, 409);
  });

  test("User can create separate out of office entries for consecutive dates", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    await user.apiLogin();

    await goToOOOPage(page);
    await openOOODialog(page);

    //Creates 2 OOO entries:
    //First OOO is created on Next month 1st - 3rd
    await selectDateAndCreateOOO(page, "1", "3");
    await expect(page.locator(`data-testid=table-redirect-n-a`).nth(0)).toBeVisible();

    //Second OOO is created on Next month 4th - 6th
    await openOOODialog(page);
    await selectDateAndCreateOOO(page, "4", "6");
    await expect(page.locator(`data-testid=table-redirect-n-a`).nth(1)).toBeVisible();
  });

  test.describe("Date range filters", () => {
    test("Default date range filter set to `Last 7 Days`", async ({ page, users }) => {
      const user = await users.create({ name: `userOne=${Date.now()}` });
      await user.apiLogin();
      await goToOOOPage(page);
      await addFilter(page, "dateRange");
      await expect(
        page.locator('[data-testid="filter-popover-trigger-dateRange"]', { hasText: "Last 7 Days" }).first()
      ).toBeVisible();
    });

    test("Can choose date range presets", async ({ page, users }) => {
      const user = await users.create({ name: `userOne=${Date.now()}` });
      await user.apiLogin();
      await goToOOOPage(page);
      await addFilter(page, "dateRange");

      await expect(page.locator('[data-testid="date-range-options-tdy"]')).toBeVisible(); //Today
      await expect(page.locator('[data-testid="date-range-options-w"]')).toBeVisible(); //Last 7 Days
      await expect(page.locator('[data-testid="date-range-options-t"]')).toBeVisible(); //Last 30 Days
      await expect(page.locator('[data-testid="date-range-options-m"]')).toBeVisible(); //Month to Date
      await expect(page.locator('[data-testid="date-range-options-y"]')).toBeVisible(); //Year to Date
      await expect(page.locator('[data-testid="date-range-options-c"]')).toBeVisible(); //Custom
    });

  });
});

async function saveAndWaitForResponse(page: Page, expectedStatusCode = 200) {
  await submitAndWaitForResponse(page, "/api/trpc/ooo/outOfOfficeCreateOrUpdate?batch=1", {
    action: () => page.getByTestId("create-or-edit-entry-ooo-redirect").click(),
    expectedStatusCode,
  });
}

async function selectToAndFromDates(
  page: Page,
  fromDate: string,
  toDate: string,
  month: "previous" | "next" = "next"
) {
  await page.getByTestId("date-range").click();
  await page.locator(".rdp").waitFor({ state: "visible" });

  await page.locator(`button[name="${month}-month"]`).click();

  await page.locator(`button[name="day"]:text-is("${fromDate}")`).nth(0).click();
  await page.locator(`button[name="day"]:text-is("${toDate}")`).nth(0).click();

  await page.keyboard.press("Escape");
}

async function selectDateAndCreateOOO(
  page: Page,
  fromDate: string,
  toDate: string,
  month: "previous" | "next" = "next"
) {
  await selectToAndFromDates(page, fromDate, toDate, month);

  await page.getByTestId("reason_select").click();
  await page.getByTestId("select-option-4").click();
  await page.getByTestId("notes_input").click();
  await page.getByTestId("notes_input").fill("Demo notes");
  await saveAndWaitForResponse(page);
}

async function goToOOOPage(page: Page) {
  const entriesListRespPromise = page.waitForResponse(
    (response) => response.url().includes("outOfOfficeEntriesList") && response.status() === 200
  );
  await page.goto("/settings/my-account/out-of-office");
  await page.waitForLoadState("domcontentloaded");
  await entriesListRespPromise;
}

async function openOOODialog(page: Page) {
  await page.getByTestId("add_entry_ooo").click();
}
