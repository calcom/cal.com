import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multi Select Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multi Select and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "text",
      "Test Multi Select question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "text",
      "Test Multi Select question and Short Text question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
