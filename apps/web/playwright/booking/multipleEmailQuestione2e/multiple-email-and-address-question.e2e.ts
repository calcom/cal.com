import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multiple Email Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multiple Email and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "address",
      "Test Phone question and Address question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "address",
      "Test Multiple Email question and Address question (only multiple email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
