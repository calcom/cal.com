import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Configure booking forwarding", () => {
  test("User can configure booking forwarding", async ({ page, users }) => {
    const user = await users.create({ name: "30min" });
    const userTo = await users.create({ name: "30min" });
    await user.apiLogin();

    await page.goto(`/settings/my-account/out-of-office`);

    await page.locator("data-testid=username-or-email").fill(userTo.email);

    // send request
    await page.locator("data-testid=send-request-forwarding").click();
  });

  test("User can accept booking forwarding", async ({ page, users }) => {
    const user = await users.create({ name: "30min" });
    const userTo = await users.create({ name: "30min" });
    await userTo.apiLogin();
    const uuid = uuidv4();
    await prisma.bookingForwarding.create({
      data: {
        start: dayjs().startOf("day").add(1, "hour").toDate(),
        uuid,
        end: dayjs().startOf("day").add(2, "hour").toDate(),
        user: { connect: { id: user.id } },
        toUser: { connect: { id: userTo.id } },
        status: "PENDING",
        createdAt: new Date(),
      },
    });

    await page.goto(`/booking-forwarding/accept/${uuid}`);

    await expect(page.locator("text=You have already accepted booking forwarding.")).toBeVisible();

    await page.goto(`/booking-forwarding/reject/${uuid}`);

    await expect(page.locator("text=You have already rejected booking forwarding.")).toBeVisible();
  });

  test("Profile redirection", async ({ page, users }) => {
    const user = await users.create({ name: "30min" });
    const userTo = await users.create({ name: "30min" });
    const uuid = uuidv4();
    await prisma.bookingForwarding.create({
      data: {
        start: dayjs().startOf("day").toDate(),
        end: dayjs().startOf("day").add(1, "w").toDate(),
        uuid,
        user: { connect: { id: user.id } },
        toUser: { connect: { id: userTo.id } },
        status: "ACCEPTED",
        createdAt: new Date(),
      },
    });

    await page.goto(`/${user.username}`);

    await page.waitForLoadState("networkidle");

    // regex to match username
    expect(page.url()).toMatch(new RegExp(`/${userTo.username}`));

    await page.goto(`/${userTo.username}/30-min`);

    expect(page.url()).toMatch(new RegExp(`/${userTo.username}/30-min`));
  });
});
