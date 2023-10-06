import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Address Question and Phone Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Address and Phone required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "phone",
      "Test Address question and Phone question (both required)",
      bookingOptions
    );
  });

  test("Address and Phone not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "phone",
      "Test Address question and Phone question (only address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
