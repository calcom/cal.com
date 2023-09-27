import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multiple Email Question and checkbox group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multiple Email and checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "checkbox",
      "Test Multiple Email question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "checkbox",
      "Test Multiple Email question and checkbox group question (only multi email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
