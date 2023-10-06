import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multi Select Question and Multi email Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multi Select and Multi email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "multiemail",
      "Test Multi Select question and Multi email question (both required)",
      bookingOptions
    );
  });

  test("Multi Select and Multi email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiselect",
      users,
      "multiemail",
      "Test Multi Select question and Multi email question (only multi select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
