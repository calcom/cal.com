import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Select Question and Multi email Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Select and Multi email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "multiemail",
      "Test Select question and Multi email question (both required)",
      bookingOptions
    );
  });

  test("Select and Multi email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "multiemail",
      "Test Select question and Multi email question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
