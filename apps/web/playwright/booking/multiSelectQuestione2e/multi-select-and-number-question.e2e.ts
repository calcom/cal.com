import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multi Select Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multi Select and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "number",
      "Test Multi Select question and number question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "number",
      "Test Multi Select question and number question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
