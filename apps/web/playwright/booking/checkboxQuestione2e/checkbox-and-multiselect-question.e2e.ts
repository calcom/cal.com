import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Checkbox and Multiselect required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "multiselect",
      "Test Checkbox question and Multiselect question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Multiselect not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "multiselect",
      "Test Checkbox question and Multiselect question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
