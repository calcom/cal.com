import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Checkbox Group Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox Group and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "text",
      "Test Checkbox Group question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "text",
      "Test Checkbox Group question and Short Text question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
