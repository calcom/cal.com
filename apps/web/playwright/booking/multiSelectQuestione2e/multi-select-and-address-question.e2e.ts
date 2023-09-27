import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multi Select Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multi Select and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "address",
      "Test Multi Select question and Address question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "address",
      "Test Phone question and Address question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
