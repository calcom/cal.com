import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Address Question and select Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Address and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "select",
      "Test Address question and select question (both required)",
      bookingOptions
    );
  });

  test("Address and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "select",
      "Test Address question and select question (only address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
