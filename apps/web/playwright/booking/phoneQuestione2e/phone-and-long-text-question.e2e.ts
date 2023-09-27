import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Long text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Phone and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "textarea",
      "Test Phone question and Long text question (both required)",
      bookingOptions
    );
  });

  test("Phone and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "textarea",
      "Test Phone question and Long text question (only Phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
