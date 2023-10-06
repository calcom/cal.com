import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Long Text Question and multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Long Text and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "multiselect",
      "Test Long Text question and multiselect question (both required)",
      bookingOptions
    );
  });

  test("Long Text and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "multiselect",
      "Test Long Text question and multiselect question (only long text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
