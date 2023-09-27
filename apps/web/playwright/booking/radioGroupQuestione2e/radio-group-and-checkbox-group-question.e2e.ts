import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Radio Group Question and checkbox group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Radio Group and checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "checkbox",
      "Test Radio Group question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "checkbox",
      "Test Radio Group question and checkbox group question (only radio required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
