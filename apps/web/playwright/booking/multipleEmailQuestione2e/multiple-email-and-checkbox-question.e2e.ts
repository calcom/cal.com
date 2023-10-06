import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe("Booking With Multiple Email Question and checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Multiple Email and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "boolean",
      "Test Multiple Email question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "boolean",
      "Test Multiple Email question and checkbox question (only multi email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
