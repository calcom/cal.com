import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Radio Group Question and Long text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Radio Group and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "textarea",
      "Test Radio Group question and Long text question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "textarea",
      "Test Radio Group question and Long text question (only radio required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
