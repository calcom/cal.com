import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Select Question and Long text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Select and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "textarea",
      "Test Select question and Long text question (both required)",
      bookingOptions
    );
  });

  test("Select and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "textarea",
      "Test Select question and Long text question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
