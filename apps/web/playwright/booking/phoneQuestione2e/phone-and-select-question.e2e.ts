import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Phone Question and select Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Phone and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "select",
      "Test Phone question and select question (both required)",
      bookingOptions
    );
  });

  test("Phone and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "select",
      "Test Phone question and select question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
