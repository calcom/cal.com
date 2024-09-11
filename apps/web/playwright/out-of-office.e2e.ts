import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Out of office", () => {
  test("User can create out of office entry", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await page.goto("/settings/my-account/out-of-office");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("add_entry_ooo").click();
    await page.waitForLoadState("networkidle");
    await page.getByTestId("reason_select").click();

    await page.getByTestId("select-option-4").click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Demo notes");

    // send request
    await submitAndWaitForResponse(page);
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
    await page.waitForLoadState("networkidle");

    await page.getByTestId("add_entry_ooo").click();
    await page.waitForLoadState("networkidle");
    await page.getByTestId("reason_select").click();

    await page.getByTestId("select-option-4").click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Demo notes");

    await page.getByTestId("profile-redirect-switch").click();

    await page.getByTestId("team_username_select").click();

    await page.locator("#react-select-3-input").fill("user");
    await page.locator("#react-select-3-input").press("Enter");

    // send request
    await submitAndWaitForResponse(page);
  });

  test("User can edit out of office entry", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    const userTo = await users.create({ name: "userTwo" });
    const userToSecond = await users.create({ name: "userThree" });

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
        {
          userId: userToSecond.id,
          teamId: team.id,
          accepted: true,
          role: "ADMIN",
        },
      ],
    });

    // Skip creating the ooo entry through front-end as we can assume that it has already been tested above.
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

    await user.apiLogin();

    await page.goto(`/settings/my-account/out-of-office`);
    await page.waitForLoadState("networkidle");

    // expect table-redirect-toUserId to be visible
    await expect(page.locator(`data-testid=table-redirect-${userTo.username}`)).toBeVisible();

    // Open the edit modal and change redirect user and note.
    await page.getByTestId(`ooo-edit-${userTo.username}`).click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Changed notes");

    await page.getByTestId("team_username_select").click();

    await page.locator("#react-select-3-input").fill("userThree");
    await page.locator("#react-select-3-input").press("Enter");

    // send request
    await submitAndWaitForResponse(page);
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
    await page.waitForLoadState("networkidle");

    const eventTypeLink = page.locator('[data-testid="event-type-link"]').first();
    await eventTypeLink.click();

    await expect(page.getByTestId("away-emoji")).toBeTruthy();
  });
});
async function submitAndWaitForResponse(page: Page) {
  const submitPromise = page.waitForResponse("/api/trpc/viewer/outOfOfficeCreateOrUpdate?batch=1");
  await page.getByTestId("create-or-edit-entry-ooo-redirect").click();
  const response = await submitPromise;
  expect(response.status()).toBe(200);
}
