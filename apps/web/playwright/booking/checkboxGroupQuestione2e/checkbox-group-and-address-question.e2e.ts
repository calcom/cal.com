import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Group Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Phone and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "address",
      "Test Phone question and Address question (both required)",
      bookingOptions
    );
  });

  test("Phone and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "address",
      "Test Phone question and Address question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
