import { expect } from "@playwright/test";

import _dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

// We default all dayjs calls to use Europe/London timezone
const dayjs = (...args: Parameters<typeof _dayjs>) => _dayjs(...args).tz("Europe/London");

test.describe("Wipe my Cal App Test", () => {
  test("Browse upcoming bookings and validate button shows and triggering wipe my cal button", async ({
    page,
    users,
    bookings,
  }) => {
    const pro = await users.create();
    const [eventType] = pro.eventTypes;
    await prisma.credential.create({
      data: {
        key: {},
        type: "wipemycal_other",
        userId: pro.id,
        appId: "wipe-my-cal",
      },
    });
    await bookings.create(
      pro.id,
      pro.username,
      eventType.id,
      {},
      dayjs().endOf("day").subtract(29, "minutes").toDate(),
      dayjs().endOf("day").toDate()
    );
    await bookings.create(pro.id, pro.username, eventType.id, {});
    await bookings.create(pro.id, pro.username, eventType.id, {});
    await pro.apiLogin();
    await page.goto("/bookings/upcoming");
    await expect(page.locator("data-testid=wipe-today-button")).toBeVisible();

    const $openBookingCount = await page.locator('[data-testid="bookings"] > *').count();
    const $todayBookingCount = await page.locator('[data-testid="today-bookings"] > *').count();
    expect($openBookingCount + $todayBookingCount).toBe(3);

    await page.locator("data-testid=wipe-today-button").click();

    // Don't await send_request click, otherwise mutation can possibly occur before observer is attached
    page.locator("data-testid=send_request").click();
    // There will not be any today-bookings
    await expect(page.locator('[data-testid="today-bookings"]')).toBeHidden();
  });
});
