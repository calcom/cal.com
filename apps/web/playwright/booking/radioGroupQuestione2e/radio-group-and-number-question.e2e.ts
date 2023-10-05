import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Radio Group Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Radio Group and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "number",
      "Test Radio Group question and number question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "number",
      "Test Radio Group question and number question (only radio group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
