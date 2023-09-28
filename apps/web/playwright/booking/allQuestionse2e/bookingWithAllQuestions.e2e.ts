import { test } from "../../lib/fixtures";
import { scheduleAllQuestionsBooking } from "../utils/scheduleAllBookings";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With All Questions", () => {
  const bookingOptions = { isAllRequired: true };

  test("Selecting and filling all questions as required", async ({ page, users }) => {
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
    await scheduleAllQuestionsBooking(page, allQuestions, users, bookingOptions);
  });
  test("Selecting and filling all questions as optional", async ({ page, users }) => {
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
    await scheduleAllQuestionsBooking(page, allQuestions, users, { ...bookingOptions, isAllRequired: false });
  });
});
