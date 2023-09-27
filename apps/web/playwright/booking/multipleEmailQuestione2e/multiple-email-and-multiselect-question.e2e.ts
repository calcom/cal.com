import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multiple Email Question and multiselect Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true, isSelect: true };
  test("Multiple Email and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "multiselect",
      "Test Multiple Email question and multiselect question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "multiselect",
      "Test Multiple Email question and multiselect question (only multi email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
