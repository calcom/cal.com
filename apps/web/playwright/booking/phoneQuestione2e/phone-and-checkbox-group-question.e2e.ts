import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and checkbox group Question", () => {
  const bookingOptions = {
    hasPlaceholder: false,
    isRequired: true,
    isCheckbox: true,
  };
  test("Phone and checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "checkbox",
      "Test Phone question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Phone and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "checkbox",
      "Test Phone question and checkbox group question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
