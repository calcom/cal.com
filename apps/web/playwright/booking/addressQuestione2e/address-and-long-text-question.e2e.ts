import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Address Question and Long text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Address and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "textarea",
      "Test Address question and Long text question (both required)",
      bookingOptions
    );
  });

  test("Address and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "textarea",
      "Test Address question and Long text question (only Address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
