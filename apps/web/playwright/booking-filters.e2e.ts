import { expect } from "@playwright/test";

import { applySelectFilter } from "./filter-helpers";
import { test } from "./lib/fixtures";
import { MembershipRole } from "@calcom/prisma/enums";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking Filters", () => {
  test("Member role should not see the member filter", async ({ page, users }) => {
    const teamMateName = "team mate 1";
    await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      teammates: [{ name: teamMateName }],
    });

    const allUsers = users.get();
    const memberUser = allUsers.find((user) => user.name === teamMateName);

    if (!memberUser) {
      throw new Error("user should exist");
    }

    await memberUser.apiLogin();
    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;
    await page.locator('[data-testid="add-filter-button"]').click();
    await expect(page.locator('[data-testid="add-filter-item-userId"]')).toBeHidden();
  });

  test("Admin role should see the member filter", async ({ page, users }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });

    await owner.apiLogin();
    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;
    await page.locator('[data-testid="add-filter-button"]').click();
    await expect(page.locator('[data-testid="add-filter-item-userId"]')).toBeVisible();
  });

  test("Query params should be preserved when switching between bookings tabs", async ({ page, users }) => {
    const owner = await users.create(
      { name: "Owner User" },
      {
        hasTeam: true,
        isOrg: true,
        teammates: [{ name: "Team Member 1" }, { name: "Team Member 2" }],
      }
    );

    await owner.apiLogin();

    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;

    await applySelectFilter(page, "userId", "Owner User");

    await expect(page).toHaveURL(/.*userId.*/);
    const urlWithFilters = page.url();
    expect(urlWithFilters).toContain("userId");

    const searchParams = new URL(urlWithFilters).searchParams;
    const activeFilters = searchParams.get("activeFilters");
    expect(activeFilters).toBeTruthy();

    const pastBookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.getByTestId("past-test").click();
    await expect(page).toHaveURL(/\/bookings\/past/);
    await pastBookingsGetResponse;

    const pastUrl = page.url();
    expect(pastUrl).toContain("/bookings/past");
    expect(pastUrl).toContain("userId");

    const pastSearchParams = new URL(pastUrl).searchParams;
    expect(pastSearchParams.get("activeFilters")).toBe(activeFilters);

    const cancelledBookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.getByTestId("cancelled-test").click();
    await expect(page).toHaveURL(/\/bookings\/cancelled/);
    await cancelledBookingsGetResponse;

    const cancelledUrl = page.url();
    expect(cancelledUrl).toContain("/bookings/cancelled");
    expect(cancelledUrl).toContain("userId");

    const cancelledSearchParams = new URL(cancelledUrl).searchParams;
    expect(cancelledSearchParams.get("activeFilters")).toBe(activeFilters);
  });

  test("Query params should be preserved when switching between bookings tabs in calendar view", async ({
    page,
    users,
  }) => {
    const owner = await users.create(
      { name: "Owner User" },
      {
        hasTeam: true,
        isOrg: true,
        teammates: [{ name: "Team Member 1" }, { name: "Team Member 2" }],
      }
    );

    await owner.apiLogin();

    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming?view=calendar`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;

    await applySelectFilter(page, "userId", "Owner User");

    await expect(page).toHaveURL(/.*userId.*/);
    const urlWithFilters = page.url();
    expect(urlWithFilters).toContain("userId");

    const searchParams = new URL(urlWithFilters).searchParams;
    const activeFilters = searchParams.get("activeFilters");
    expect(activeFilters).toBeTruthy();
    expect(searchParams.get("view")).toBe("calendar");

    const pastBookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.getByTestId("past-test").click();
    await expect(page).toHaveURL(/\/bookings\/past/);
    await pastBookingsGetResponse;

    const pastUrl = page.url();
    expect(pastUrl).toContain("/bookings/past");
    expect(pastUrl).toContain("userId");

    const pastSearchParams = new URL(pastUrl).searchParams;
    expect(pastSearchParams.get("activeFilters")).toBe(activeFilters);
    expect(pastSearchParams.get("view")).toBe("calendar");

    const cancelledBookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.getByTestId("cancelled-test").click();
    await expect(page).toHaveURL(/\/bookings\/cancelled/);
    await cancelledBookingsGetResponse;

    const cancelledUrl = page.url();
    expect(cancelledUrl).toContain("/bookings/cancelled");
    expect(cancelledUrl).toContain("userId");

    const cancelledSearchParams = new URL(cancelledUrl).searchParams;
    expect(cancelledSearchParams.get("activeFilters")).toBe(activeFilters);
    expect(cancelledSearchParams.get("view")).toBe("calendar");
  });

  test("Query params should NOT be preserved when navigating from a non-bookings page", async ({
    page,
    users,
  }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });

    await owner.apiLogin();
    await page.goto(`/event-types?someParam=value`);
    await expect(page).toHaveURL(/.*someParam=value.*/);

    const upcomingBookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.getByTestId("bookings-test").click();
    await page.getByTestId("upcoming-test").click();
    await expect(page).toHaveURL(/\/bookings\/upcoming/);
    await upcomingBookingsGetResponse;

    const upcomingUrl = page.url();
    expect(upcomingUrl).toContain("/bookings/upcoming");
    expect(upcomingUrl).not.toContain("someParam=value");
  });

  test("Query params should NOT be preserved when navigating from a bookings page to a non-bookings page", async ({
    page,
    users,
  }) => {
    const owner = await users.create(
      { name: "Owner User" },
      {
        hasTeam: true,
        isOrg: true,
        teammates: [{ name: "Team Member 1" }, { name: "Team Member 2" }],
      }
    );

    await owner.apiLogin();

    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );
    await page.goto(`/bookings/upcoming`, { waitUntil: "domcontentloaded" });
    await bookingsGetResponse;

    await applySelectFilter(page, "userId", "Owner User");

    await expect(page).toHaveURL(/.*userId.*/);
    const urlWithFilters = page.url();
    expect(urlWithFilters).toContain("userId");

    await page.getByTestId("event_types_page_title-test").click();
    await expect(page).toHaveURL(/\/event-types/);

    const eventTypeSearchParams = new URL(page.url()).searchParams;
    expect(eventTypeSearchParams.get("activeFilters")).toBeFalsy();
  });
  
  test("Filter segments with removed team members should not cause stuck UI", async ({
    page,
    users,
    prisma,
  }) => {
    const teamOwner = await users.create(undefined, {
      hasTeam: true,
      teamRole: MembershipRole.OWNER,
    });
    const secondUser = await users.create({ name: "Second" });
    const thirdUser = await users.create({ name: "Third" });
    const { team } = await teamOwner.getFirstTeamMembership();
    // Add teammates to the team
    await prisma.membership.createMany({
      data: [
        {
          teamId: team.id,
          userId: secondUser.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
        {
          teamId: team.id,
          userId: thirdUser.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    await teamOwner.apiLogin();

    const bookingsGetResponse = page.waitForResponse((response) =>
      /\/api\/trpc\/bookings\/get.*/.test(response.url())
    );

    await page.goto(`/bookings/upcoming`);

    await bookingsGetResponse;

    await test.step("Create filter segment with team member userIds", async () => {
      await page.getByTestId("add-filter-button").click();
      await page.getByTestId("add-filter-item-userId").click();

      await page.getByTestId(`select-filter-options-userId`).getByRole("option", { name: "Second" }).click();
      await page.getByTestId(`select-filter-options-userId`).getByRole("option", { name: "Third" }).click();
      await page.keyboard.press("Escape");

      const segmentName = "Team Members Filter";
      await page.getByTestId("save-filter-segment-button").click();
      await page.getByTestId("save-filter-segment-name").fill(segmentName);
      await page.getByTestId("save-filter-segment-dialog").getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Filter segment saved")).toBeVisible();
    });

    await test.step("Remove one team member from team", async () => {
      await prisma.membership.delete({
        where: {
          userId_teamId: {
            userId: secondUser.id,
            teamId: team.id,
          },
        },
      });
    });

    await test.step("Verify filter segment still works and UI is not stuck", async () => {
      await page.reload();
      await page.waitForLoadState("domcontentloaded");

      await expect(page.getByTestId("add-filter-button")).toBeVisible();

      await expect(page.getByText("You do not have permissions")).toBeHidden();
    });
  });
});
