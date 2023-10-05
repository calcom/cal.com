import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Radio Group Question and checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Radio Group and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "boolean",
      "Test Radio Group question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "boolean",
      "Test Radio Group question and checkbox question (only radio required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
