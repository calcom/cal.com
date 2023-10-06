import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Long Text Question and Multiple email Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Long Text and Multiple email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "multiemail",
      "Test Long Text question and Multiple email question (both required)",
      bookingOptions
    );
  });

  test("Long Text and Multiple email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "multiemail",
      "Test Long Text question and Multiple email question (only long text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
