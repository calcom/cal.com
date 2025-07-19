import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Advanced Booking Features", () => {
  test("Should handle seat-based bookings", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Seat Event");
    await page.locator("[name=slug]").fill("seat-event");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=advanced`);

    await page.locator('[data-testid="offer-seats-toggle"]').click();
    await page.locator('[name="seatsPerTimeSlot"]').fill("3");
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/seat-event`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });

  test("Should handle payment integration", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Paid Event");
    await page.locator("[name=slug]").fill("paid-event");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=advanced`);

    await page.locator('[data-testid="require-payment-toggle"]').click();
    await page.locator('[name="price"]').fill("50");
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/paid-event`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="payment-page"]')).toBeVisible();
  });

  test("Should handle complex booking questions", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Complex Questions Event");
    await page.locator("[name=slug]").fill("complex-questions");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=advanced`);

    await page.locator('[data-testid="add-question"]').click();
    await page.locator('[data-testid="question-title"]').fill("Select your preference");
    await page.locator('[data-testid="question-type"]').selectOption("select");
    await page.locator('[data-testid="add-option"]').click();
    await page.locator('[data-testid="option-text"]').fill("Option 1");
    await page.locator('[data-testid="save-question"]').click();

    await page.locator('[data-testid="add-question"]').click();
    await page.locator('[data-testid="question-title"]').fill("Additional notes");
    await page.locator('[data-testid="question-type"]').selectOption("textarea");
    await page.locator('[data-testid="save-question"]').click();

    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/complex-questions`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[name="responses.Select your preference"]').selectOption("Option 1");
    await page.locator('[name="responses.Additional notes"]').fill("Some additional notes");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });

  test("Should handle booking with workflows", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/workflows");
    await page.locator('[data-testid="new-workflow"]').click();
    await page.locator('[name="name"]').fill("Test Workflow");
    await page.locator('[data-testid="create-workflow"]').click();

    await page.locator('[data-testid="add-action"]').click();
    await page.locator('[data-testid="action-email"]').click();
    await page.locator('[name="reminderBody"]').fill("Reminder: You have a meeting scheduled");
    await page.locator('[data-testid="save-workflow"]').click();

    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Workflow Event");
    await page.locator("[name=slug]").fill("workflow-event");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=workflows`);
    await page.locator('[data-testid="add-workflow"]').click();
    await page.locator('[data-testid="workflow-Test Workflow"]').click();
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/workflow-event`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });

  test("Should handle recurring bookings", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Recurring Event");
    await page.locator("[name=slug]").fill("recurring-event");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=recurring`);

    await page.locator('[data-testid="recurring-event-toggle"]').click();
    await page.locator('[name="recurringEvent.freq"]').selectOption("2");
    await page.locator('[name="recurringEvent.count"]').fill("3");
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/recurring-event`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });
});

test.describe("Booking Limits and Restrictions", () => {
  test("Should respect duration limits", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Duration Limited Event");
    await page.locator("[name=slug]").fill("duration-limited");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=limits`);

    await page.locator('input[name="durationLimits.PER_DAY"]').fill("60");
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/duration-limited`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.locator('[name="name"]').fill("John Doe");
    await page.locator('[name="email"]').fill("john@example.com");
    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();
  });

  test("Should handle minimum booking notice", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.locator('[data-testid="new-event-type"]').click();
    await page.locator("[name=title]").fill("Notice Required Event");
    await page.locator("[name=slug]").fill("notice-required");
    await page.locator("[data-testid=update-eventtype]").click();

    const eventTypeId = await page.locator("[data-testid=update-eventtype]").getAttribute("data-id");
    await page.goto(`/event-types/${eventTypeId}?tabName=advanced`);

    await page.locator('[name="minimumBookingNotice"]').fill("1440");
    await page.locator("[data-testid=update-eventtype]").click();

    await page.goto(`/${user.username}/notice-required`);
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
  });
});
