import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multi Select Question and select Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multi Select and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "select",
      "Test Multi Select question and select question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "select",
      "Test Multi Select question and select question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
