import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "number",
      "Test Checkbox question and number question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "number",
      "Test Checkbox question and number question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
