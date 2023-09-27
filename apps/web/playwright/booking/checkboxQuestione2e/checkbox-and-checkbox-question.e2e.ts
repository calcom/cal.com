import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Checkbox group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox and Checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "checkbox",
      "Test Checkbox question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "checkbox",
      "Test Checkbox question and checkbox group question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
