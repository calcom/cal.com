import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Phone Question and checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Phone and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "boolean",
      "Test Phone question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Phone and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "boolean",
      "Test Phone question and checkbox question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
