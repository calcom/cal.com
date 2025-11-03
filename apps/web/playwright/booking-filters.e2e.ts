import { expect } from "@playwright/test";

import { applySelectFilter } from "./filter-helpers";
import { test } from "./lib/fixtures";

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
});
