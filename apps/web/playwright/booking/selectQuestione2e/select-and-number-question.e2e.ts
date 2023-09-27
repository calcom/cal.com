import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Select Question and Number Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Select and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "number",
      "Test Select question and number question (both required)",
      bookingOptions
    );
  });

  test("Select and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "number",
      "Test Select question and number question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
