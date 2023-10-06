import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multi Select Question and Phone Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multi Select and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "phone",
      "Test Multi Select question and phone question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "phone",
      "Test Multi Select question and phone question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
