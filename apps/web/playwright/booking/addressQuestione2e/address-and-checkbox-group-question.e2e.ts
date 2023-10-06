import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Address Question and Checkbox Group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Address and checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "checkbox",
      "Test Address question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Address and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "checkbox",
      "Test Address question and checkbox group question (only address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
