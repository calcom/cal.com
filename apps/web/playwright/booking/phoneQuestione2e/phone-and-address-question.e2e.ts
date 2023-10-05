import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Phone Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Phone and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "address",
      "Test Phone question and Address question (both required)",
      bookingOptions
    );
  });

  test("Phone and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "address",
      "Test Phone question and Address question (only Phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
