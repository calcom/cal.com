import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Select Question and Radio group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Select and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "radio",
      "Test Select question and Radio group question (both required)",
      bookingOptions
    );
  });

  test("Select and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "radio",
      "Test Select question and Radio group question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
