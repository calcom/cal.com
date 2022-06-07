import { expect } from "@playwright/test";
import dayjs from "dayjs";

import { test } from "../../lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Validate Wipe my Calendar button", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });
  test("Browse upcoming bookings and validate button shows", async ({ page, users, bookings }) => {
    const pro = await users.create();
    const [eventType] = pro.eventTypes;
    await prisma?.credential.create({
      data: {
        key: {},
        type: "wipemycal_other",
        userId: pro.id,
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
    await pro.login();
    await page.goto("/bookings/upcoming");
    await expect(page.locator("data-testid=wipe-today-button")).toBeVisible();
  });
});

test.describe("WipeMyCal should reschedule only one booking", () => {
  test("Browse apple-calendar and try to install", async ({ page, users, bookings }) => {
    const pro = await users.create();
    const [eventType] = pro.eventTypes;
    await prisma?.credential.create({
      data: {
        key: {},
        type: "wipemycal_other",
        userId: pro.id,
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

    await pro.login();
    await page.goto("/bookings/upcoming");

    const totalUserBookings = await prisma?.booking.findMany({
      where: {
        userId: pro.id,
      },
    });
    expect(totalUserBookings?.length).toBe(3);
    await page.locator("data-testid=wipe-today-button").click();
    await page.locator("data-testid=send_request").click();
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(200);
    const totalUserBookingsCancelled = await prisma?.booking.findMany({
      where: {
        userId: pro.id,
        status: "CANCELLED",
      },
    });

    await expect(totalUserBookingsCancelled?.length).toBe(1);
  });
});
