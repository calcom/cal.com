import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Group Question and Long text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox Group and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "textarea",
      "Test Checkbox Group question and Long text question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "textarea",
      "Test Checkbox Group question and Long text question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
