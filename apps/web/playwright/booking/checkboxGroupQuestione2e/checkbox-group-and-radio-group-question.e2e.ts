import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Checkbox Group Question and Radio group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox Group and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "radio",
      "Test Checkbox Group question and Radio group question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "radio",
      "Test Checkbox Group question and Radio group question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
