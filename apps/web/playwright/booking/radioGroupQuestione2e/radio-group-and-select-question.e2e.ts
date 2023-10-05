import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Radio Group Question and select Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Radio Group and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "select",
      "Test Radio Group question and select question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "select",
      "Test Radio Group question and select question (only radio group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
