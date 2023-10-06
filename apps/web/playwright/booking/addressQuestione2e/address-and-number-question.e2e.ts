import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Address Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Address and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "number",
      "Test Address question and number question (both required)",
      bookingOptions
    );
  });

  test("Address and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "number",
      "Test Address question and number question (only address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
