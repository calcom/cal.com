import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Checkbox Group Question and Phone Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox and Phone required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "phone",
      "Test Checkbox Group question and Phone question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and Phone not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "phone",
      "Test Checkbox Group question and checkbox group question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
