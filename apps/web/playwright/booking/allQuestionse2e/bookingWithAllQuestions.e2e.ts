import { loginUser } from "../../fixtures/regularBookings";
import { test } from "../../lib/fixtures";
import { scheduleAllQuestionsBooking } from "../utils/scheduleAllBookings";

test.describe("Booking With All Questions", () => {
  test.beforeEach(async ({ page, users }) => {
    await loginUser(users);
    await page.goto("/event-types");
  });

  const bookingOptions = { isAllRequired: true };

  test("Selecting and filling all questions as required", async ({ page }) => {
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
    await scheduleAllQuestionsBooking(page, allQuestions, bookingOptions);
  });
  test("Selecting and filling all questions as optional", async ({ page }) => {
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
    await scheduleAllQuestionsBooking(page, allQuestions, { ...bookingOptions, isAllRequired: false });
  });
});
