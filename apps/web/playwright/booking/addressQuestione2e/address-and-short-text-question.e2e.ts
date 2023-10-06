import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Address Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Address and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "text",
      "Test Address question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Address and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "text",
      "Test Address question and Short Text question (only address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
