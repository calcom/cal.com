import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Radio Group Question and multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Radio Group and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "multiselect",
      "Test Radio Group question and multiselect question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "multiselect",
      "Test Radio Group question and multiselect question (only radio required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
