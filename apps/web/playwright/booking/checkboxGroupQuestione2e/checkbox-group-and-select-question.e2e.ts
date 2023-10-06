import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Checkbox Group Question and select Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox Group and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "select",
      "Test Checkbox Group question and select question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "select",
      "Test Checkbox Group question and select question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
