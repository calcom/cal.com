import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Long Text Question and checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Long Text and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "boolean",
      "Test Long Text question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Long Text and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "boolean",
      "Test Long Text question and checkbox question (only text area required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
