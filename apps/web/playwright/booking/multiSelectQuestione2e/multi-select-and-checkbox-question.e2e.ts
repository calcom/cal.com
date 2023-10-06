import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multi Select Question and checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multi Select and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "boolean",
      "Test Multi Select question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "boolean",
      "Test Multi Select question and checkbox question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
