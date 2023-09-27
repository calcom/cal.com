import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multiple Email Question and select Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multiple Email and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "select",
      "Test Multiple Email question and select question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "select",
      "Test Multiple Email question and select question (only multiple email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
