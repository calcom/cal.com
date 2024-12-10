import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";
import { submitAndWaitForResponse, localize, clickUntilDialogVisible } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Out of office", () => {
  test("User can create out of office entry", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await page.goto("/settings/my-account/out-of-office");

    await page.getByTestId("add_entry_ooo").click();
    await page.getByTestId("reason_select").click();

    await page.getByTestId("select-option-4").click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Demo notes");

    // send request
    await saveAndWaitForResponse(page);

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

    await page.getByTestId("add_entry_ooo").click();
    await page.getByTestId("reason_select").click();

    await page.getByTestId("select-option-4").click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Demo notes");

    await page.getByTestId("profile-redirect-switch").click();

    await page.getByTestId(`team_username_select_${userTo.id}`).click();

    // send request
    await saveAndWaitForResponse(page);

    // expect table-redirect-toUserId to be visible
    await expect(page.locator(`data-testid=table-redirect-${userTo.username}`)).toBeVisible();
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

    // expect table-redirect-toUserId to be visible
    await expect(page.locator(`data-testid=table-redirect-${userTo.username}`)).toBeVisible();

    // Open the edit modal and change redirect user and note.
    await page.getByTestId(`ooo-edit-${userTo.username}`).click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Changed notes");

    await page.getByTestId(`team_username_select_${userToSecond.id}`).click();

    // send request
    await saveAndWaitForResponse(page);

    // expect entry with new username exist.
    await expect(page.locator(`data-testid=table-redirect-${userToSecond.username}`)).toBeVisible();

    // expect new note to be present.
    await expect(page.locator(`data-testid=ooo-entry-note-${userToSecond.username}`)).toBeVisible();
    await expect(page.locator(`data-testid=ooo-entry-note-${userToSecond.username}`)).toContainText(
      "Changed notes"
    );
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

    await expect(page.getByTestId("away-emoji")).toBeTruthy();
  });

  test("User can create Entry for past", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await page.goto("/settings/my-account/out-of-office");

    await page.getByTestId("add_entry_ooo").click();

    await page.locator('[data-testid="date-range"]').click();

    await selectToAndFromDates(page, "13", "22", true);

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

    await page.goto("/settings/my-account/out-of-office");

    await page.getByTestId("add_entry_ooo").click();

    await page.locator('[data-testid="date-range"]').click();

    await selectToAndFromDates(page, "13", "22");

    // send request
    await saveAndWaitForResponse(page);
    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();

    // add another entry
    await page.getByTestId("add_entry_ooo").click();

    await page.locator('[data-testid="date-range"]').click();

    await selectToAndFromDates(page, "11", "24");

    // send request
    await saveAndWaitForResponse(page);

    await expect(page.locator(`data-testid=table-redirect-n-a`)).toHaveCount(2);
  });

  test("User cannot create duplicate entries", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });

    await user.apiLogin();

    await page.goto("/settings/my-account/out-of-office");

    await page.getByTestId("add_entry_ooo").click();

    await page.locator('[data-testid="date-range"]').click();

    await selectToAndFromDates(page, "13", "22");

    // send request
    await saveAndWaitForResponse(page);
    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();

    // add another entry
    await page.getByTestId("add_entry_ooo").click();

    await page.locator('[data-testid="date-range"]').click();

    await selectToAndFromDates(page, "13", "22");

    // send request
    await saveAndWaitForResponse(page, 409);
  });

  test("User can create separate out of office entries for consecutive dates", async ({ page, users }) => {
    const user = await users.create({ name: "userOne" });
    await user.apiLogin();

    await page.goto("/settings/my-account/out-of-office");
    await page.waitForLoadState();

    const addOOOButton = await page.getByTestId("add_entry_ooo");
    const dateButton = await page.locator('[data-testid="date-range"]');

    //Creates 2 OOO entries:
    //First OOO is created on Next month 1st - 3rd
    await clickUntilDialogVisible(addOOOButton, dateButton);
    await dateButton.click();
    await selectDateAndCreateOOO(page, "1", "3");
    await expect(page.locator(`data-testid=table-redirect-n-a`).nth(0)).toBeVisible();

    //Second OOO is created on Next month 4th - 6th
    await clickUntilDialogVisible(addOOOButton, dateButton);
    await dateButton.click();
    await selectDateAndCreateOOO(page, "4", "6");
    await expect(page.locator(`data-testid=table-redirect-n-a`).nth(1)).toBeVisible();
  });

  test("User can create consecutive reverse redirect OOOs", async ({ page, users }) => {
    const teamMatesObj = [{ name: "member-1" }, { name: "member-2" }];
    const owner = await users.create(
      { name: "owner" },
      {
        hasTeam: true,
        isOrg: true,
        teammates: teamMatesObj,
      }
    );
    const member1User = users.get().find((user) => user.name === "member-1");

    await owner.apiLogin();

    await page.goto("/settings/my-account/out-of-office");
    await page.waitForLoadState();

    const addOOOButton = await page.getByTestId("add_entry_ooo");
    const dateButton = await page.locator('[data-testid="date-range"]');

    //As owner,OOO is created on Next month 1st - 3rd, forwarding to 'member-1'
    await clickUntilDialogVisible(addOOOButton, dateButton);
    await dateButton.click();
    await selectDateAndCreateOOO(page, "1", "3", "member-1");
    await expect(
      page.locator(`data-testid=table-redirect-${member1User?.username ?? "n-a"}`).nth(0)
    ).toBeVisible();

    //As member1, OOO is created on Next month 4th - 5th, forwarding to 'owner'
    await member1User?.apiLogin();
    await page.goto("/settings/my-account/out-of-office");
    await page.waitForLoadState();
    await clickUntilDialogVisible(addOOOButton, dateButton);
    await dateButton.click();
    await selectDateAndCreateOOO(page, "4", "5", "owner");
    await expect(page.locator(`data-testid=table-redirect-${owner.username ?? "n-a"}`).nth(0)).toBeVisible();
  });

  test("User cannot create infinite or overlapping reverse redirect OOOs", async ({ page, users }) => {
    const t = await localize("en");
    const teamMatesObj = [{ name: "member-1" }, { name: "member-2" }];
    const owner = await users.create(
      { name: "owner" },
      {
        hasTeam: true,
        isOrg: true,
        teammates: teamMatesObj,
      }
    );
    const member1User = users.get().find((user) => user.name === "member-1");

    await owner.apiLogin();

    await page.goto("/settings/my-account/out-of-office");
    await page.waitForLoadState();

    const addOOOButton = await page.getByTestId("add_entry_ooo");
    const dateButton = await page.locator('[data-testid="date-range"]');

    //As owner,OOO is created on Next month 1st - 3rd, forwarding to 'member-1'
    await clickUntilDialogVisible(addOOOButton, dateButton);
    await dateButton.click();
    await selectDateAndCreateOOO(page, "1", "3", "member-1");
    await expect(
      page.locator(`data-testid=table-redirect-${member1User?.username ?? "n-a"}`).nth(0)
    ).toBeVisible();

    //As member1, expect error while OOO is created on Next month 2nd - 5th, forwarding to 'owner'
    await member1User?.apiLogin();
    await page.goto("/settings/my-account/out-of-office");
    await page.waitForLoadState();
    await clickUntilDialogVisible(addOOOButton, dateButton);
    await dateButton.click();
    await selectDateAndCreateOOO(page, "2", "5", "owner", 400);
    await expect(page.locator(`text=${t("booking_redirect_infinite_not_allowed")}`)).toBeTruthy();
  });
});

async function saveAndWaitForResponse(page: Page, expectedStatusCode = 200) {
  await submitAndWaitForResponse(page, "/api/trpc/viewer/outOfOfficeCreateOrUpdate?batch=1", {
    action: () => page.getByTestId("create-or-edit-entry-ooo-redirect").click(),
    expectedStatusCode,
  });
}

async function selectToAndFromDates(page: Page, fromDate: string, toDate: string, isRangeInPast = false) {
  const month = isRangeInPast ? "previous" : "next";

  await page.locator(`button[name="${month}-month"]`).click();

  await page.locator(`button[name="day"]:has-text("${fromDate}")`).nth(0).click();
  await page.locator(`button[name="day"]:has-text("${toDate}")`).nth(0).click();
}

async function selectDateAndCreateOOO(
  page: Page,
  fromDate: string,
  toDate: string,
  redirectToUser?: string,
  expectedStatusCode = 200
) {
  const t = await localize("en");
  await page.locator(`button[name="next-month"]`).click();
  await page.locator(`button[name="day"]:has-text("${fromDate}")`).nth(0).click();
  await page.locator(`button[name="day"]:has-text("${toDate}")`).nth(0).click();
  await page.locator(`text=${t("create_an_out_of_office")}`).click();
  await page.getByTestId("reason_select").click();
  await page.getByTestId("select-option-4").click();
  await page.getByTestId("notes_input").click();
  await page.getByTestId("notes_input").fill("Demo notes");
  if (redirectToUser) {
    await page.getByTestId("profile-redirect-switch").click();
    await page.locator(`text=${redirectToUser}`).click();
  }
  await saveAndWaitForResponse(page, expectedStatusCode);
}
