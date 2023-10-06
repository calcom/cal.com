import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Phone Question and Radio group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Phone and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "radio",
      "Test Phone question and Radio group question (both required)",
      bookingOptions
    );
  });

  test("Phone and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "radio",
      "Test Phone question and Radio group question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
