import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Phone and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "number",
      "Test Phone question and number question (both required)",
      bookingOptions
    );
  });

  test("Phone and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "number",
      "Test Phone question and number question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
