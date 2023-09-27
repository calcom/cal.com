import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Long Text Question and checkbox group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Long Text and checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "checkbox",
      "Test Long Text question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Long Text and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "checkbox",
      "Test Long Text question and checkbox group question (only long text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
