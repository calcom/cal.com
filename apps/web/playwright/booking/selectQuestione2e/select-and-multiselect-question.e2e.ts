import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Select Question and multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Select and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "multiselect",
      "Test Select question and multiselect question (both required)",
      bookingOptions
    );
  });

  test("Select and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "multiselect",
      "Test Select question and multiselect question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
