import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Select Question and Phone Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Select and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "phone",
      "Test Select question and select question (both required)",
      bookingOptions
    );
  });

  test("Select and Phone not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "phone",
      "Test Select question and phone question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
