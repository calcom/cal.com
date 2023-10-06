import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Long Text Question and Phone Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Long Text and Phone required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "phone",
      "Test Long Text question and Phone question (both required)",
      bookingOptions
    );
  });

  test("Long Text and Phone not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "phone",
      "Test Long Text question and Phone question (only logb text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
