import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true, isMultiSelect: true };
  test("Address and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "multiselect",
      "Test Address question and multiselect question (both required)",
      bookingOptions
    );
  });

  test("Address and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "multiselect",
      "Test Address question and multiselect question (only Address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
