import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Core Booking Functionality", () => {
  test("Should be able to book a basic event", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Basic Event");
    await page.locator("[name=slug]").fill("basic-event");
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/basic-event`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });

  test("Should be able to reschedule a booking", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await bookTimeSlot(page, {
      name: "John Doe",
      email: "john@example.com",
    });

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();

    const bookingUrl = page.url();
    const params = new URL(bookingUrl).searchParams;
    const uid = params.get("uid");
    expect(uid).toBeTruthy();

    await page.goto(`/reschedule/${uid}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
    await expect(page.locator("[data-testid=success-page]")).toContainText("This meeting is scheduled");
  });

  test("Should be able to cancel a booking", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await bookTimeSlot(page, {
      name: "John Doe",
      email: "john@example.com",
    });

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();

    const bookingUrl = page.url();
    const params = new URL(bookingUrl).searchParams;
    const uid = params.get("uid");
    expect(uid).toBeTruthy();

    await page.goto(`/cancel/${uid}`);
    await page.locator('[data-testid="cancel-booking-button"]').click();

    await expect(page.locator('[data-testid="cancelled-page"]')).toBeVisible();
  });

  test("Should display booking confirmation details", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await bookTimeSlot(page, {
      name: "John Doe",
      email: "john@example.com",
    });

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
    await expect(page.locator("[data-testid=success-page]")).toContainText("This meeting is scheduled");
    await expect(page.locator("[data-testid=success-page]")).toContainText("John Doe");
    await expect(page.locator("[data-testid=success-page]")).toContainText("john@example.com");
  });

  test("Should handle booking with custom questions", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Event with Questions");
    await page.locator("[name=slug]").fill("event-with-questions");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=advanced`);

    await page.locator('[data-testid="add-question"]').click();
    await page.locator('[data-testid="question-title"]').fill("What is your company?");
    await page.locator('[data-testid="save-question"]').click();
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/event-with-questions`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[name="responses.What is your company?"]').fill("Acme Corp");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });

  test("Should handle booking with different durations", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Multiple Duration Event");
    await page.locator("[name=slug]").fill("multiple-duration");
    await page.locator("[data-testid=multiple-duration]").click();
    await page.locator("[data-testid=duration-15]").click();
    await page.locator("[data-testid=duration-30]").click();
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/multiple-duration`);
    await page.locator('[data-testid="duration-15"]').click();
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });
});

test.describe("Dynamic Booking Pages", () => {
  test("Should load dynamic user booking page", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto(`/${user.username}`);
    await expect(page.locator('[data-testid="event-types"]')).toBeVisible();
    await expect(page.locator(`text=${user.name}`)).toBeVisible();
  });

  test("Should display available event types on user page", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto(`/${user.username}`);
    await expect(page.locator('[data-testid="event-type-link"]')).toHaveCount(1);
  });

  test("Should navigate from user page to event booking", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto(`/${user.username}`);
    await page.locator('[data-testid="event-type-link"]').first().click();
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
  });

  test("Should handle team booking pages", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/teams");
    await page.locator('[data-testid="new-team-btn"]').click();
    await page.locator('[name="name"]').fill("Test Team");
    await page.locator('[data-testid="create-team-btn"]').click();

    const teamSlug = await page.locator('[data-testid="team-slug"]').textContent();
    await page.goto(`/team/${teamSlug}`);
    await expect(page.locator('[data-testid="team-page"]')).toBeVisible();
  });
});
