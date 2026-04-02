import { MembershipRole } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  cancelBookingFromBookingsList,
  confirmBooking,
  confirmReschedule,
  doOnOrgDomain,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test("dynamic booking", async ({ page, users }) => {
  const pro = await users.create();
  await pro.apiLogin();

  const free = await users.create({ username: "free.example" });
  await page.goto(`/${pro.username}+${free.username}`);
  //fix race condition
  await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor({ state: "visible" });

  await test.step("book an event first day in next month", async () => {
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Fill what is this meeting about? title
    await page.locator('[name="title"]').fill("Test meeting");

    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  await test.step("can reschedule a booking", async () => {
    // Logged in
    await page.goto("/bookings/upcoming");
    // Click the ellipsis menu button to open the dropdown
    await page.locator('[data-testid="booking-actions-dropdown"]').nth(0).click();
    // Click the reschedule option in the dropdown
    await page.locator('[data-testid="reschedule"]').click();
    await page.waitForURL((url) => {
      const bookingId = url.searchParams.get("rescheduleUid");
      return !!bookingId;
    });
    await selectSecondAvailableTimeSlotNextMonth(page);

    // No need to fill fields since they should be already filled
    await confirmReschedule(page);
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  await test.step("Can cancel the recently created booking", async () => {
    await page.goto("/bookings/upcoming");
    await cancelBookingFromBookingsList({
      page,
      nth: 0,
      reason: "Test reason",
    });
  });
});

test("dynamic booking info prefilled by query params", async ({ page, users }) => {
  const pro = await users.create();
  await pro.apiLogin();

  let duration = 15;
  const free = await users.create({ username: "free.example" });
  await page.goto(`/${pro.username}+${free.username}?duration=${duration}`);

  const listItemByDurationTestId = (duration: number) => `multiple-choice-${duration}mins`;

  let listItemLocator = await page.getByTestId(listItemByDurationTestId(duration));
  let activeState = await listItemLocator.getAttribute("data-active");

  expect(activeState).toEqual("true");

  duration = 30;
  await page.goto(`/${pro.username}+${free.username}?duration=${duration}`);
  listItemLocator = await page.getByTestId(listItemByDurationTestId(duration));
  activeState = await listItemLocator.getAttribute("data-active");

  expect(activeState).toEqual("true");

  // Check another badge just to ensure its not selected
  listItemLocator = await page.getByTestId(listItemByDurationTestId(15));
  activeState = await listItemLocator.getAttribute("data-active");
  expect(activeState).toEqual("false");
});

test("multiple duration selection updates event length correctly", async ({ page, users }) => {
  const user = await users.create();
  await user.apiLogin();

  await test.step("update event title to include duration placeholder", async () => {
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
    await page.click(`text=Multiple duration`);
    await page.waitForSelector('[data-testid="event-title"]');
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
    await page.getByTestId("vertical-tab-event_advanced_tab_title").click();
    await page.fill('[name="eventName"]', "{Event duration} event btwn {Organiser} {Scheduler}");
    await page.locator('[data-testid="update-eventtype"]').click();
    await page.waitForResponse("/api/trpc/eventTypesHeavy/update?batch=1");
  });

  await page.goto(`/${user.username}/multiple-duration`);

  await page.waitForURL((url) => {
    return url.searchParams.get("overlayCalendar") === "true";
  });

  await page.locator('[data-testid="multiple-choice-30mins"]').waitFor({ state: "visible" });

  await test.step("verify default 30min duration is selected", async () => {
    const duration30 = page.getByTestId("multiple-choice-30mins");
    const activeState = await duration30.getAttribute("data-active");
    expect(activeState).toEqual("true");
  });

  await test.step("book with 90min duration and verify title", async () => {
    await page.getByTestId("multiple-choice-90mins").click();
    await page.locator('[data-testid="time"]').nth(0).waitFor({ state: "visible" });

    const duration90 = page.getByTestId("multiple-choice-90mins");
    const activeState = await duration90.getAttribute("data-active");
    expect(activeState).toEqual("true");

    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.fill('[name="name"]', "Test User");
    await page.fill('[name="email"]', "test@example.com");
    await confirmBooking(page);

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const bookingTitle = page.locator('[data-testid="booking-title"]');
    await expect(bookingTitle).toBeVisible();
    const titleText = await bookingTitle.textContent();
    expect(titleText).toContain("90");
  });
});

// eslint-disable-next-line playwright/no-skipped-test
test.skip("it contains the right event details", async ({ page }) => {
  const response = await page.goto(`http://acme.cal.local:3000/owner1+member1`);
  expect(response?.status()).toBe(200);

  await expect(page.locator('[data-testid="event-title"]')).toHaveText("Group Meeting");
  await expect(page.locator('[data-testid="event-meta"]')).toContainText("Acme Inc");

  expect((await page.locator('[data-testid="event-meta"] [data-testid="avatar"]').all()).length).toBe(3);
});

test.describe("Organization:", () => {
  test.afterEach(({ orgs, users }) => {
    orgs.deleteAll();
    users.deleteAll();
  });
  test("Can book a time slot for an organization", async ({ page, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
    });

    const user1 = await users.create({
      organizationId: org.id,
      name: "User 1",
      roleInOrganization: MembershipRole.ADMIN,
    });

    const user2 = await users.create({
      organizationId: org.id,
      name: "User 2",
      roleInOrganization: MembershipRole.ADMIN,
    });
    await doOnOrgDomain(
      {
        orgSlug: org.slug,
        page,
      },
      async () => {
        await page.goto(`/${user1.username}+${user2.username}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page, {
          title: "Test meeting",
        });
        await expect(page.getByTestId("success-page")).toBeVisible();
        // All the teammates should be in the booking

        await expect(page.getByText(user1.name!, { exact: true })).toBeVisible();

        await expect(page.getByText(user2.name!, { exact: true })).toBeVisible();
      }
    );
  });

  test("dynamic booking for usernames with special characters", async ({ page, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
    });

    const user1 = await users.create({
      organizationId: org.id,
      name: "User 1",
      roleInOrganization: MembershipRole.MEMBER,
    });

    const user2 = await users.create({
      username: "ßenny-Joo", // ß is a special character
      organizationId: org.id,
      name: "User 2",
      roleInOrganization: MembershipRole.MEMBER,
    });
    await doOnOrgDomain(
      {
        orgSlug: org.slug,
        page,
      },
      async () => {
        const response = await page.goto(`/${user1.username}+${user2.username}`);
        expect(response?.status()).not.toBe(500);
      }
    );
  });
});
