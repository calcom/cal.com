import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multiple Email Question and Long text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multiple Email and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "textarea",
      "Test Multiple Email question and Long text question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "textarea",
      "Test Multiple Email question and Long text question (only multiple email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
