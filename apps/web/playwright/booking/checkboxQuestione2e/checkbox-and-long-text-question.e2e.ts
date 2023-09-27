import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Long Text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox and Long Text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "textarea",
      "Test Checkbox question and Long Text question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Long Text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "textarea",
      "Test Checkbox question and Long Text question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
