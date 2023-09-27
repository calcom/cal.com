import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multiple Email Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multiple Email and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "number",
      "Test Multiple Email question and number question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "number",
      "Test Multiple Email question and number question (only multi email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
