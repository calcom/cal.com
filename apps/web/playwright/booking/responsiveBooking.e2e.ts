/* eslint-disable playwright/no-conditional-in-test */
import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

const resolutions = [
  {
    width: 1920,
    height: 1080,
  },
  {
    width: 1280,
    height: 720,
  },
  {
    width: 640,
    height: 480,
  },
];

test.describe("Booking With All Questions", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");

    const allQuestions = [
      "phone",
      "address",
      "checkbox",
      "boolean",
      "textarea",
      "multiemail",
      "multiselect",
      "number",
      "radio",
      "select",
      "text",
    ];
    for (const question of allQuestions) {
      if (
        question !== "number" &&
        question !== "select" &&
        question !== "checkbox" &&
        question !== "boolean" &&
        question !== "multiselect" &&
        question !== "radio"
      ) {
        await bookingPage.addQuestion(
          question,
          `${question}-test`,
          `${question} test`,
          true,
          `${question} test`
        );
      } else {
        await bookingPage.addQuestion(question, `${question}-test`, `${question} test`, true);
      }
      await bookingPage.checkField(question);
    }
  });

  for (const resolution of resolutions) {
    test(`Booking with ${resolution.width}x${resolution.height} resolution and all questions`, async ({
      bookingPage,
    }) => {
      await bookingPage.setResolution(resolution.width, resolution.height);
      await bookingPage.updateEventType();
    });
  }
});

test.describe("Booking With no questions", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  for (const resolution of resolutions) {
    test(`Booking with ${resolution.width}x${resolution.height} resolution and no questions`, async ({
      bookingPage,
    }) => {
      await bookingPage.setResolution(resolution.width, resolution.height);
      await bookingPage.updateEventType();
    });
  }
});

test.describe("Booking page with no questions", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  for (const resolution of resolutions) {
    test(`Booking page with ${resolution.width}x${resolution.height} resolution`, async ({ bookingPage }) => {
      const eventTypePage = await bookingPage.previewEventType();
      await eventTypePage.setViewportSize({ width: resolution.width, height: resolution.height });
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.confirmBooking(eventTypePage);
    });
  }
});
