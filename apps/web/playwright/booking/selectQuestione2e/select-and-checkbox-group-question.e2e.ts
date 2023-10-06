import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Select Question and checkbox group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Select and checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "checkbox",
      "Test Select question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Select and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "checkbox",
      "Test Select question and checkbox group question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
