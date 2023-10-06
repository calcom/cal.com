import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Phone Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Phone and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "text",
      "Test Phone question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Phone and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "text",
      "Test Phone question and Short Text question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
