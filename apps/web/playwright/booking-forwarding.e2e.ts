import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking forwarding", () => {
  test("User should be asked to create a team if /settings/my-account/out-of-office", async ({
    page,
    users,
  }) => {
    const user = await users.create({ name: "userOne" });
    await user.apiLogin();

    await page.goto(`/settings/my-account/out-of-office`);

    await expect(page.locator("data-testid=create_team_booking_forwarding")).toBeVisible();
  });

  test("User can configure booking forwarding", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    const userTo = await users.create({ name: "userTwo" });

    const team = await prisma.team.create({
      data: {
        name: "test-insights",
        slug: `test-insights-${Date.now()}-${randomString(5)}}`,
      },
    });

    // create memberships
    await prisma.membership.createMany({
      data: [
        {
          userId: user.id,
          teamId: team.id,
          accepted: true,
          role: "ADMIN",
        },
        {
          userId: userTo.id,
          teamId: team.id,
          accepted: true,
          role: "ADMIN",
        },
      ],
    });

    await user.apiLogin();

    await page.goto(`/settings/my-account/out-of-office`);

    await page.locator(".bg-default > div > div:nth-child(2)").first().click();
    await page.locator("#react-select-2-option-0 div").click();

    // send request
    await page.locator("data-testid=send-request-forwarding").click();

    // expect table-forwarding-toUserId to be visible
    await expect(page.locator(`data-testid=table-forwarding-${userTo.username}`)).toBeVisible();
  });

  test("User can accept/reject booking forwarding", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    const userTo = await users.create({ name: "userTwo" });
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

    await expect(page.locator("data-testid=success_accept_forwarding")).toBeTruthy();

    await page.goto(`/booking-forwarding/reject/${uuid}`);

    await expect(page.locator("data-testid=success_reject_forwarding")).toBeTruthy();
  });

  test("Profile redirection", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    const userTo = await users.create({ name: "userTwo" });
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

  test("User with no team shouldn't be redirected to /settings/my-account/out-of-office", async ({
    page,
    users,
  }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await page.goto("/event-types");

    await page.locator("data-testid=user-dropdown-trigger-button").first().click();

    await page.locator("data-testid=set-away-button").click();

    // expect not to be redirected to /settings/my-account/out-of-office
    await expect(page.url()).not.toBe("/settings/my-account/out-of-office");
  });
});
