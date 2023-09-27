import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "address",
      "Test Checkbox question and Address question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "address",
      "Test Checkbox question and Address question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
