import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Long Text Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Long Text and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "number",
      "Test Long Text question and number question (both required)",
      bookingOptions
    );
  });

  test("Long Text and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "number",
      "Test Long Text question and number question (only long text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
