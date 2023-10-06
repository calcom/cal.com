import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Phone Question and multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Phone and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "multiselect",
      "Test Phone question and multiselect question (both required)",
      bookingOptions
    );
  });

  test("Phone and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "multiselect",
      "Test Phone question and multiselect question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
