import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Radio Group Question and Phone group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Radio Group and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "phone",
      "Test Radio Group question and Phone question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "radio",
      "Test Radio Group question and Phone question (only radio group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
