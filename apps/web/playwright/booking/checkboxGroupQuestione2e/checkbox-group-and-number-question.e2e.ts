import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Group Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox Group and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "number",
      "Test Checkbox Group question and number question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "number",
      "Test Checkbox Group question and number question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
