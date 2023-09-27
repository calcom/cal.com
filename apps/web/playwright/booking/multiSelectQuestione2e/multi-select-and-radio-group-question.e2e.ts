import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multi Select Question and Radio group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multi Select and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "radio",
      "Test Multi Select question and Radio group question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "radio",
      "Test Multi Select question and Radio group question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
