import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multi Select Question and checkbox group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multi Select and checkbox group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "checkbox",
      "Test Multi Select question and checkbox group question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and checkbox group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "checkbox",
      "Test Multi Select question and checkbox group question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
