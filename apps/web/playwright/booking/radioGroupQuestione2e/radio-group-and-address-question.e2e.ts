import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Radio Group Question and Address Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Radio Group and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "address",
      "Test Radio Group question and Address question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "address",
      "Test Radio Group question and Address question (only radio Group required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
