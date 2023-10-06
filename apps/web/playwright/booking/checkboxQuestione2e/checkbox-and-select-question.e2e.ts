import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Checkbox Question and Select Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox and Select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "select",
      "Test Checkbox question and Select question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "select",
      "Test Checkbox question and Select question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
