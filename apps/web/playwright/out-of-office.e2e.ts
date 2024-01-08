import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Out of office", () => {
  test("User can create out of office entry", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await page.goto("/settings/my-account/out-of-office");

    await page.locator("data-testid=send-request-redirect").click();

    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();
  });

  test("User can configure booking redirect", async ({ page, users }) => {
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

    await page.getByTestId("profile-redirect-switch").click({ timeout: 500 });

    await page.locator(".bg-default > div > div:nth-child(2)").first().click();
    await page.locator("#react-select-2-option-0 div").click();

    // send request
    await page.locator("data-testid=send-request-redirect").click();

    // expect table-redirect-toUserId to be visible
    await expect(page.locator(`data-testid=table-redirect-${userTo.username}`)).toBeVisible();
  });

  test("User can accept/reject booking redirect", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    const userTo = await users.create({ name: "userTwo" });
    await userTo.apiLogin();
    const uuid = uuidv4();
    await prisma.outOfOfficeEntry.create({
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

    await page.goto(`/booking-redirect/accept/${uuid}`);

    // todo: check whatever text is shown on EmptyScreen
    // await expect(page.locator("data-testid=success_accept_redirect")).toBeTruthy();

    await page.goto(`/booking-redirect/reject/${uuid}`);

    // todo: check whatever text is shown on EmptyScreen
    // await expect(page.locator("data-testid=success_reject_redirect")).toBeTruthy();
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
