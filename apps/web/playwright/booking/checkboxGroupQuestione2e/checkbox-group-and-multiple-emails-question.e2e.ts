import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Group Question and Multi email Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox Group and Multi email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "multiemail",
      "Test Checkbox Group question and Multi email question (both required)",
      bookingOptions
    );
  });

  test("Checkbox Group and Multi email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "checkbox",
      users,
      "multiemail",
      "Test Checkbox Group question and Multi email question (only checkbox group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
