import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multi Select Question and Long text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multi Select and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "textarea",
      "Test Multi Select question and Long text question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "textarea",
      "Test Multi Select question and Long text question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
