import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Group Question and multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox Group and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "multiselect",
      "Test Checkbox Group question and multiselect question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "multiselect",
      "Test Checkbox Group question and multiselect question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
