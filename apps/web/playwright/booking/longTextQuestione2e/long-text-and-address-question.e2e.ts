import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Long Text Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Long Text and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "address",
      "Test Long Text question and Address question (both required)",
      bookingOptions
    );
  });

  test("Long Text and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "address",
      "Test Long Text question and Address question (only long text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
