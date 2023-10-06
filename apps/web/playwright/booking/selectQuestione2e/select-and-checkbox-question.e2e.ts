import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Select Question and checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Select and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "boolean",
      "Test Select question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Select and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "boolean",
      "Test Select question and checkbox question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
