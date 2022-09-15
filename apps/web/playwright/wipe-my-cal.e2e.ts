import { expect } from "@playwright/test";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

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
    await pro.login();
    await page.goto("/bookings/upcoming");

    await expect(page.locator("data-testid=wipe-today-button")).toBeVisible();

    const $openBookingCount = await page.locator('[data-testid="bookings"] > *').count();
    await expect($openBookingCount).toBe(3);

    await page.locator("data-testid=wipe-today-button").click();
    await page.locator("data-testid=send_request").click();

    const $openBookings = await page.locator('[data-testid="bookings"]');
    await $openBookings.evaluate((ul) => {
      return new Promise<void>((resolve) =>
        new window.MutationObserver(() => {
          if (ul.childElementCount === 2) {
            resolve();
          }
        }).observe(ul, { childList: true })
      );
    });

    await users.deleteAll();
  });
});
