import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Select Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Select and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "select",
      "Test Select question and Address question (both required)",
      bookingOptions
    );
  });

  test("Select and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "select",
      "Test Select question and Address question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
