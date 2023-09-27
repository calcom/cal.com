import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Group Question and checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox Group and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "boolean",
      "Test Checkbox Group question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "boolean",
      "Test Checkbox Group question and checkbox question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
