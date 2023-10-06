import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multiple Email Question and Radio group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multiple Email and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "radio",
      "Test Multiple Email question and Radio group question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "radio",
      "Test Multiple Email question and Radio group question (only multiple email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
